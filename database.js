require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { MongoClient, GridFSBucket } = require('mongodb');

// SQLite Fallback Setup
const dbPath = path.resolve(__dirname, 'portfolio.db');
const sqliteDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ SQLite fallback database initialized at', dbPath);
  }
});

let mongoClient = null;
let mongoDb = null;
let gridFSBucket = null;
let isMongoReady = false;

// Connect to MongoDB Atlas if URI is provided
async function connectMongo(retries = 3) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('ℹ️ No MONGODB_URI found. Running on local SQLite database.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db('portfolio');
      gridFSBucket = new GridFSBucket(mongoDb, { bucketName: 'uploads' });
      isMongoReady = true;
      console.log('🚀 Connected to MongoDB Atlas Cloud Database (Portfolio-Cluster)');

      // Sync any existing local files in uploads folder to GridFS
      syncUploadsFolderToGridFS().catch(() => {});

      // Ensure initial admin credentials and seed data exist in MongoDB
      await initMongoData();
      return;
    } catch (err) {
      console.error(`⚠️ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log('⚠️ Falling back to local SQLite database.');
        isMongoReady = false;
      }
    }
  }
}

// Upload local disk files to GridFS if not already there
async function syncUploadsFolderToGridFS() {
  if (!gridFSBucket) return;
  const dirs = [
    path.join(__dirname, 'uploads', 'images'),
    path.join(__dirname, 'uploads', 'documents')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const filename of files) {
      const filePath = path.join(dir, filename);
      try {
        const existing = await mongoDb.collection('uploads.files').findOne({ filename });
        if (!existing) {
          const uploadStream = gridFSBucket.openUploadStream(filename);
          fs.createReadStream(filePath).pipe(uploadStream);
          console.log(`☁️ Synced ${filename} to MongoDB GridFS`);
        }
      } catch (e) {}
    }
  }
}

// Save a single file stream to GridFS
async function saveFileToGridFS(filename, filePath) {
  if (!gridFSBucket || !fs.existsSync(filePath)) return null;
  return new Promise((resolve, reject) => {
    const uploadStream = gridFSBucket.openUploadStream(filename);
    fs.createReadStream(filePath)
      .pipe(uploadStream)
      .on('finish', () => resolve(uploadStream.id))
      .on('error', reject);
  });
}

// -------------------------------------------------------------
// MongoDB Query Engine (Adapts SQL queries seamlessly)
// -------------------------------------------------------------

function parseQuery(query, params = []) {
  const cleanQ = query.replace(/\s+/g, ' ').trim();
  let m;

  // 1. SELECT COUNT(*)
  m = cleanQ.match(/SELECT\s+COUNT\(\*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?$/i);
  if (m) {
    const alias = m[1];
    const table = m[2];
    const whereStr = m[3];
    const filter = {};
    if (whereStr) {
      if (/status\s*=\s*['"]pending['"]/i.test(whereStr)) filter.status = 'pending';
      else if (/status\s*=\s*\?/i.test(whereStr)) filter.status = params[0];
    }
    return { type: 'count', table, alias, filter };
  }

  // 2. SELECT MAX(field)
  m = cleanQ.match(/SELECT\s+MAX\((\w+)\)\s+as\s+(\w+)\s+FROM\s+(\w+)/i);
  if (m) {
    return { type: 'max', field: m[1], alias: m[2], table: m[3] };
  }

  // 3. SELECT * FROM table
  m = cleanQ.match(/^SELECT\s+\*\s+FROM\s+(\w+)(.*?)$/i);
  if (m) {
    const table = m[1];
    const rest = m[2];
    const filter = {};
    let sort = null;
    let limit = null;

    if (/WHERE\s+id\s*=\s*\?/i.test(rest)) {
      filter.id = Number(params[0]);
    } else if (/WHERE\s+username\s*=\s*\?/i.test(rest)) {
      filter.username = params[0];
    } else if (/WHERE\s+status\s*=\s*['"]approved['"]/i.test(rest)) {
      filter.status = 'approved';
    } else if (/WHERE\s+status\s*=\s*\?/i.test(rest)) {
      filter.status = params[0];
    } else if (/WHERE\s+is_active\s*=\s*1/i.test(rest)) {
      filter.is_active = 1;
    }

    if (/LIMIT\s+(\d+)/i.test(rest)) {
      limit = parseInt(rest.match(/LIMIT\s+(\d+)/i)[1], 10);
    }

    if (/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i.test(rest)) {
      const orderStr = rest.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i)[1];
      sort = {};
      const parts = orderStr.split(',');
      for (const p of parts) {
        const [field, dir] = p.trim().split(/\s+/);
        if (field) {
          sort[field] = (dir && dir.toUpperCase() === 'DESC') ? -1 : 1;
        }
      }
    }

    return { type: 'select', table, filter, sort, limit };
  }

  // 4. INSERT INTO table (cols) VALUES (...)
  m = cleanQ.match(/^INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES/i);
  if (m) {
    const table = m[1];
    const cols = m[2].split(',').map(c => c.trim());
    return { type: 'insert', table, cols, params };
  }

  // 5. UPDATE table SET ... WHERE ...
  m = cleanQ.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+?)$/i);
  if (m) {
    const table = m[1];
    const setClause = m[2];
    const whereClause = m[3];
    return { type: 'update', table, setClause, whereClause, params };
  }

  // 6. DELETE FROM table WHERE ...
  m = cleanQ.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+?)$/i);
  if (m) {
    const table = m[1];
    const whereClause = m[2];
    return { type: 'delete', table, whereClause, params };
  }

  return { type: 'raw', query, params };
}

// SQLite Promisified Functions
const sqliteRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const sqliteGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const sqliteAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// -------------------------------------------------------------
// Unified Exported Query Helpers
// -------------------------------------------------------------

async function getQuery(query, params = []) {
  if (isMongoReady && mongoDb) {
    try {
      const q = parseQuery(query, params);
      const col = mongoDb.collection(q.table);

      if (q.type === 'count') {
        const count = await col.countDocuments(q.filter || {});
        return { [q.alias]: count, count };
      }
      if (q.type === 'max') {
        const doc = await col.find({}).sort({ [q.field]: -1 }).limit(1).next();
        return { [q.alias]: doc ? (doc[q.field] || 0) : 0 };
      }
      if (q.type === 'select') {
        let cursor = col.find(q.filter || {});
        if (q.sort) cursor = cursor.sort(q.sort);
        const doc = await cursor.limit(1).next();
        return doc || null;
      }
    } catch (e) {
      console.error('Mongo getQuery error, falling back to SQLite:', e.message);
    }
  }
  return sqliteGet(query, params);
}

async function allQuery(query, params = []) {
  if (isMongoReady && mongoDb) {
    try {
      const q = parseQuery(query, params);
      const col = mongoDb.collection(q.table);

      if (q.type === 'select') {
        let cursor = col.find(q.filter || {});
        if (q.sort) cursor = cursor.sort(q.sort);
        if (q.limit) cursor = cursor.limit(q.limit);
        return await cursor.toArray();
      }
    } catch (e) {
      console.error('Mongo allQuery error, falling back to SQLite:', e.message);
    }
  }
  return sqliteAll(query, params);
}

async function runQuery(query, params = []) {
  if (isMongoReady && mongoDb) {
    try {
      const q = parseQuery(query, params);
      const col = mongoDb.collection(q.table);

      if (q.type === 'insert') {
        const lastDoc = await col.find({}).sort({ id: -1 }).limit(1).next();
        const newId = (lastDoc && typeof lastDoc.id === 'number') ? lastDoc.id + 1 : 1;
        const doc = { id: newId };
        q.cols.forEach((colName, idx) => {
          doc[colName] = params[idx] !== undefined ? params[idx] : null;
        });
        await col.insertOne(doc);
        return { lastID: newId, changes: 1 };
      }

      if (q.type === 'update') {
        const filter = {};
        if (/id\s*=\s*\?/i.test(q.whereClause)) {
          filter.id = Number(params[params.length - 1]);
        } else if (/username\s*=\s*\?/i.test(q.whereClause)) {
          filter.username = params[params.length - 1];
        } else if (/id\s*=\s*1/i.test(q.whereClause)) {
          filter.id = 1;
        }

        const setClauses = q.setClause.split(',').map(s => s.trim());
        const $set = {};
        let pIdx = 0;
        for (const sc of setClauses) {
          const parts = sc.split('=').map(x => x.trim());
          const colName = parts[0];
          const valStr = parts[1];
          if (/CURRENT_TIMESTAMP/i.test(valStr)) {
            $set[colName] = new Date().toISOString();
          } else if (valStr === '?') {
            $set[colName] = params[pIdx++];
          } else if (valStr) {
            $set[colName] = valStr.replace(/^['"]|['"]$/g, '');
          }
        }
        const res = await col.updateOne(filter, { $set });
        return { changes: res.modifiedCount };
      }

      if (q.type === 'delete') {
        const filter = {};
        if (/id\s*=\s*\?/i.test(q.whereClause)) {
          filter.id = Number(params[0]);
        } else if (/username\s*=\s*\?/i.test(q.whereClause)) {
          filter.username = params[0];
        }
        const res = await col.deleteOne(filter);
        return { changes: res.deletedCount };
      }
    } catch (e) {
      console.error('Mongo runQuery error, falling back to SQLite:', e.message);
    }
  }
  return sqliteRun(query, params);
}

// -------------------------------------------------------------
// MongoDB Initial Migration & Sync
// -------------------------------------------------------------

async function initMongoData() {
  if (!mongoDb) return;
  const tables = [
    'admin_users',
    'profile',
    'services',
    'projects',
    'education',
    'experience',
    'certifications',
    'reviews',
    'custom_blocks',
    'skills',
    'theme_settings'
  ];

  for (const table of tables) {
    try {
      const col = mongoDb.collection(table);
      const count = await col.countDocuments();
      if (count === 0) {
        const rows = await sqliteAll(`SELECT * FROM ${table}`).catch(() => []);
        if (rows.length > 0) {
          await col.insertMany(rows);
          console.log(`📦 Seeded ${rows.length} rows from SQLite to MongoDB Atlas [${table}]`);
        }
      }
    } catch (err) {
      console.error(`Error migrating table ${table} to Mongo:`, err.message);
    }
  }

  // Ensure Admin user credentials in Mongo
  try {
    const adminCol = mongoDb.collection('admin_users');
    const targetUser = 'komalyadav';
    const targetPass = 'komal642006';
    const hashedPassword = await bcrypt.hash(targetPass, 10);
    const existing = await adminCol.findOne({ username: targetUser });
    if (!existing) {
      await adminCol.insertOne({ id: 1, username: targetUser, password_hash: hashedPassword, created_at: new Date() });
      console.log(`👤 Configured admin credentials in MongoDB Atlas: ${targetUser}`);
    } else {
      await adminCol.updateOne({ username: targetUser }, { $set: { password_hash: hashedPassword } });
    }
    await adminCol.deleteMany({ username: 'admin' });
  } catch (e) {}
}

// Start MongoDB connection
connectMongo();

module.exports = {
  db: sqliteDb,
  runQuery,
  getQuery,
  allQuery,
  getMongoDb: () => mongoDb,
  getGridFSBucket: () => gridFSBucket,
  saveFileToGridFS
};
