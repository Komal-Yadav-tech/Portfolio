const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { db, runQuery, getQuery, allQuery } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'komal_super_secret_jwt_key_2026_production';

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads', 'images'),
  path.join(__dirname, 'uploads', 'documents')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, path.join(__dirname, 'uploads', 'images'));
    } else {
      cb(null, path.join(__dirname, 'uploads', 'documents'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowedImage = /jpeg|jpg|png|gif|webp|svg/;
    const allowedDoc = /pdf|doc|docx|txt|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedImage.test(ext) || allowedDoc.test(ext) || allowedImage.test(file.mimetype) || file.mimetype.includes('pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.auth_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session' });
    }
    req.user = user;
    next();
  });
};

// Optional token extractor for endpoints that can be viewed by public or admin
const optionalAuth = (req, res, next) => {
  const token = req.cookies.auth_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
};

/* ==========================================================================
   AUTH API ROUTES
   ========================================================================== */

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await getQuery('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ success: true, authenticated: true, user: req.user });
});

/* ==========================================================================
   PROFILE & GENERAL INFO API
   ========================================================================== */

app.get('/api/profile', async (req, res) => {
  try {
    const profile = await getQuery('SELECT * FROM profile ORDER BY id ASC LIMIT 1');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/profile', authenticateToken, upload.fields([
  { name: 'profile_image_file', maxCount: 1 },
  { name: 'resume_file', maxCount: 1 },
  { name: 'footer_media_file', maxCount: 1 }
]), async (req, res) => {
  try {
    let profile = await getQuery('SELECT * FROM profile ORDER BY id ASC LIMIT 1');
    const b = req.body;

    let profile_image = b.profile_image || (profile ? profile.profile_image : '');
    let resume_url = b.resume_url || (profile ? profile.resume_url : '');
    let footer_media = b.footer_media || (profile ? profile.footer_media : '');

    if (req.files && req.files['profile_image_file']) {
      profile_image = '/uploads/images/' + req.files['profile_image_file'][0].filename;
    }
    if (req.files && req.files['resume_file']) {
      resume_url = '/uploads/documents/' + req.files['resume_file'][0].filename;
    }
    if (req.files && req.files['footer_media_file']) {
      footer_media = '/uploads/images/' + req.files['footer_media_file'][0].filename;
    }

    if (profile) {
      await runQuery(`
        UPDATE profile SET
          full_name = ?,
          title = ?,
          greeting = ?,
          bio = ?,
          availability_status = ?,
          profile_image = ?,
          resume_url = ?,
          email = ?,
          phone = ?,
          location = ?,
          website = ?,
          linkedin = ?,
          github = ?,
          twitter = ?,
          stats_experience = ?,
          stats_projects = ?,
          stats_clients = ?,
          quote_text = ?,
          quote_author = ?,
          quote_role = ?,
          footer_title = ?,
          footer_content = ?,
          footer_media = ?,
          skills_tag = ?,
          skills_title = ?,
          skills_desc = ?,
          about_tag = ?,
          about_title = ?,
          about_desc1 = ?,
          about_desc2 = ?,
          process_tag = ?,
          process_title = ?,
          step1_num = ?,
          step1_title = ?,
          step1_desc = ?,
          step2_num = ?,
          step2_title = ?,
          step2_desc = ?,
          step3_num = ?,
          step3_title = ?,
          step3_desc = ?,
          certs_tag = ?,
          certs_title = ?,
          certs_desc = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        b.full_name || profile.full_name,
        b.title || profile.title,
        b.greeting || profile.greeting,
        b.bio || profile.bio,
        b.availability_status || profile.availability_status,
        profile_image,
        resume_url,
        b.email || profile.email,
        b.phone || profile.phone,
        b.location || profile.location,
        b.website || profile.website,
        b.linkedin || profile.linkedin,
        b.github || profile.github,
        b.twitter || profile.twitter,
        b.stats_experience || profile.stats_experience,
        b.stats_projects || profile.stats_projects,
        b.stats_clients || profile.stats_clients,
        b.quote_text || profile.quote_text,
        b.quote_author || profile.quote_author,
        b.quote_role || profile.quote_role,
        b.footer_title || profile.footer_title,
        b.footer_content || profile.footer_content,
        footer_media,
        b.skills_tag !== undefined ? b.skills_tag : profile.skills_tag,
        b.skills_title !== undefined ? b.skills_title : profile.skills_title,
        b.skills_desc !== undefined ? b.skills_desc : profile.skills_desc,
        b.about_tag !== undefined ? b.about_tag : profile.about_tag,
        b.about_title !== undefined ? b.about_title : profile.about_title,
        b.about_desc1 !== undefined ? b.about_desc1 : profile.about_desc1,
        b.about_desc2 !== undefined ? b.about_desc2 : profile.about_desc2,
        b.process_tag !== undefined ? b.process_tag : profile.process_tag,
        b.process_title !== undefined ? b.process_title : profile.process_title,
        b.step1_num !== undefined ? b.step1_num : profile.step1_num,
        b.step1_title !== undefined ? b.step1_title : profile.step1_title,
        b.step1_desc !== undefined ? b.step1_desc : profile.step1_desc,
        b.step2_num !== undefined ? b.step2_num : profile.step2_num,
        b.step2_title !== undefined ? b.step2_title : profile.step2_title,
        b.step2_desc !== undefined ? b.step2_desc : profile.step2_desc,
        b.step3_num !== undefined ? b.step3_num : profile.step3_num,
        b.step3_title !== undefined ? b.step3_title : profile.step3_title,
        b.step3_desc !== undefined ? b.step3_desc : profile.step3_desc,
        b.certs_tag !== undefined ? b.certs_tag : profile.certs_tag,
        b.certs_title !== undefined ? b.certs_title : profile.certs_title,
        b.certs_desc !== undefined ? b.certs_desc : profile.certs_desc,
        profile.id
      ]);
    } else {
      await runQuery(`
        INSERT INTO profile (
          full_name, title, greeting, bio, availability_status,
          profile_image, resume_url, email, phone, location,
          website, linkedin, github, twitter,
          stats_experience, stats_projects, stats_clients,
          quote_text, quote_author, quote_role,
          footer_title, footer_content, footer_media,
          skills_tag, skills_title, skills_desc,
          about_tag, about_title, about_desc1, about_desc2,
          process_tag, process_title,
          step1_num, step1_title, step1_desc,
          step2_num, step2_title, step2_desc,
          step3_num, step3_title, step3_desc,
          certs_tag, certs_title, certs_desc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        b.full_name, b.title, b.greeting, b.bio, b.availability_status,
        profile_image, resume_url, b.email, b.phone, b.location,
        b.website, b.linkedin, b.github, b.twitter,
        b.stats_experience, b.stats_projects, b.stats_clients,
        b.quote_text, b.quote_author, b.quote_role,
        b.footer_title, b.footer_content, footer_media,
        b.skills_tag || '[ TECHNICAL PROFICIENCIES ]',
        b.skills_title || 'Core Technologies & Masteries',
        b.skills_desc || 'Extensive toolkit covering frontend aesthetics, 3D WebGL computation, and robust backend engineering.',
        b.about_tag || '[ BACKGROUND & VISION ]',
        b.about_title || 'Transforming Ideas Into <span>Living Digital Art</span>',
        b.about_desc1 || 'With a deep passion at the intersection of graphic design, computer science, and creative engineering, I specialize in architecting interactive web applications that leave a lasting impression.',
        b.about_desc2 || 'Every line of code is written with performance, accessibility, and aesthetic elegance in mind.',
        b.process_tag || '[ HOW I WORK ]',
        b.process_title || 'The 3-Step <span>Creative Workflow</span>',
        b.step1_num || '01',
        b.step1_title || 'DISCOVER & ANALYZE',
        b.step1_desc || 'Deep-dive into objectives, target audience dynamics, technical constraints, and visual moodboards to establish a clear architectural roadmap.',
        b.step2_num || '02',
        b.step2_title || 'IDEATE & PROTOTYPE',
        b.step2_desc || 'Iterative interactive prototyping, 3D WebGL asset experimentation, motion choreography, and high-fidelity design systems.',
        b.step3_num || '03',
        b.step3_title || 'ENGINEER & DEPLOY',
        b.step3_desc || 'Full-stack implementation with clean modular code, lighthouse speed optimization, cross-device responsiveness, and continuous deployment.',
        b.certs_tag || '[ ACCREDITATIONS & HONORS ]',
        b.certs_title || 'Verified <span>Certifications & Masteries</span>',
        b.certs_desc || 'Continuous growth through rigorous industry certifications and specialized masterclasses.'
      ]);
    }

    const updated = await getQuery('SELECT * FROM profile ORDER BY id ASC LIMIT 1');
    res.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   SERVICES API
   ========================================================================== */

app.get('/api/services', async (req, res) => {
  try {
    const services = await allQuery('SELECT * FROM services ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const { title, description, price_badge, icon, sort_order } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description required' });
    }
    const result = await runQuery(
      'INSERT INTO services (title, description, price_badge, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [title, description, price_badge || '', icon || 'fa-code', sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM services WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Service added successfully', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price_badge, icon, sort_order } = req.body;
    await runQuery(
      'UPDATE services SET title = ?, description = ?, price_badge = ?, icon = ?, sort_order = ? WHERE id = ?',
      [title, description, price_badge, icon, sort_order, id]
    );
    const updated = await getQuery('SELECT * FROM services WHERE id = ?', [id]);
    res.json({ success: true, message: 'Service updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   PROJECTS API
   ========================================================================== */

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await allQuery('SELECT * FROM projects ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/projects', authenticateToken, upload.single('media_file'), async (req, res) => {
  try {
    const { title, category, description, live_url, github_url, featured, sort_order, media_type } = req.body;
    let media_url = req.body.media_url || '';
    if (req.file) {
      media_url = '/uploads/images/' + req.file.filename;
    }
    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category required' });
    }
    const result = await runQuery(
      'INSERT INTO projects (title, category, description, media_url, media_type, live_url, github_url, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, category, description || '', media_url, media_type || 'image', live_url || '', github_url || '', featured ? 1 : 0, sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Project added successfully', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/projects/:id', authenticateToken, upload.single('media_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });

    let media_url = req.body.media_url || existing.media_url;
    if (req.file) {
      media_url = '/uploads/images/' + req.file.filename;
    }
    const { title, category, description, live_url, github_url, featured, sort_order, media_type } = req.body;

    await runQuery(
      'UPDATE projects SET title = ?, category = ?, description = ?, media_url = ?, media_type = ?, live_url = ?, github_url = ?, featured = ?, sort_order = ? WHERE id = ?',
      [
        title || existing.title,
        category || existing.category,
        description !== undefined ? description : existing.description,
        media_url,
        media_type || existing.media_type,
        live_url !== undefined ? live_url : existing.live_url,
        github_url !== undefined ? github_url : existing.github_url,
        featured !== undefined ? (featured == '1' || featured == true ? 1 : 0) : existing.featured,
        sort_order !== undefined ? sort_order : existing.sort_order,
        id
      ]
    );
    const updated = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, message: 'Project updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   EDUCATION API
   ========================================================================== */

app.get('/api/education', async (req, res) => {
  try {
    const education = await allQuery('SELECT * FROM education ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: education });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/education', authenticateToken, async (req, res) => {
  try {
    const { degree, institution, pass_year, grade_or_details, sort_order } = req.body;
    if (!degree || !institution || !pass_year) {
      return res.status(400).json({ success: false, message: 'Degree, institution, and year are required' });
    }
    const result = await runQuery(
      'INSERT INTO education (degree, institution, pass_year, grade_or_details, sort_order) VALUES (?, ?, ?, ?, ?)',
      [degree, institution, pass_year, grade_or_details || '', sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM education WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Education record added', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/education/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { degree, institution, pass_year, grade_or_details, sort_order } = req.body;
    await runQuery(
      'UPDATE education SET degree = ?, institution = ?, pass_year = ?, grade_or_details = ?, sort_order = ? WHERE id = ?',
      [degree, institution, pass_year, grade_or_details, sort_order, id]
    );
    const updated = await getQuery('SELECT * FROM education WHERE id = ?', [id]);
    res.json({ success: true, message: 'Education updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/education/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM education WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Education record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   CERTIFICATIONS API
   ========================================================================== */

app.get('/api/certifications', async (req, res) => {
  try {
    const certs = await allQuery('SELECT * FROM certifications ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: certs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/certifications', authenticateToken, upload.single('image_file'), async (req, res) => {
  try {
    const { title, issuer, issue_date, credential_url, sort_order } = req.body;
    let image_url = req.body.image_url || '';
    if (req.file) {
      image_url = '/uploads/images/' + req.file.filename;
    }
    if (!title || !issuer) {
      return res.status(400).json({ success: false, message: 'Title and issuer required' });
    }
    const result = await runQuery(
      'INSERT INTO certifications (title, issuer, issue_date, credential_url, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [title, issuer, issue_date || '', credential_url || '', image_url, sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM certifications WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Certification added', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/certifications/:id', authenticateToken, upload.single('image_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getQuery('SELECT * FROM certifications WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Certification not found' });

    let image_url = req.body.image_url || existing.image_url;
    if (req.file) {
      image_url = '/uploads/images/' + req.file.filename;
    }
    const { title, issuer, issue_date, credential_url, sort_order } = req.body;
    await runQuery(
      'UPDATE certifications SET title = ?, issuer = ?, issue_date = ?, credential_url = ?, image_url = ?, sort_order = ? WHERE id = ?',
      [
        title || existing.title,
        issuer || existing.issuer,
        issue_date !== undefined ? issue_date : existing.issue_date,
        credential_url !== undefined ? credential_url : existing.credential_url,
        image_url,
        sort_order !== undefined ? sort_order : existing.sort_order,
        id
      ]
    );
    const updated = await getQuery('SELECT * FROM certifications WHERE id = ?', [id]);
    res.json({ success: true, message: 'Certification updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/certifications/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM certifications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Certification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   REVIEWS & MODERATION SYSTEM API
   ========================================================================== */

app.get('/api/reviews', optionalAuth, async (req, res) => {
  try {
    const status = req.query.status;
    if (req.user) {
      // Admin request - can filter by status or get all
      let query = 'SELECT * FROM reviews';
      let params = [];
      if (status && status !== 'all') {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY created_at DESC';
      const reviews = await allQuery(query, params);
      const pendingCount = (await getQuery('SELECT COUNT(*) as c FROM reviews WHERE status = "pending"')).c;
      return res.json({ success: true, data: reviews, pendingCount });
    } else {
      // Public request - only approved reviews
      const reviews = await allQuery('SELECT * FROM reviews WHERE status = "approved" ORDER BY created_at DESC');
      return res.json({ success: true, data: reviews });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/reviews/public', async (req, res) => {
  try {
    const { client_name, role_company, rating, review_text } = req.body;
    if (!client_name || !role_company || !review_text) {
      return res.status(400).json({ success: false, message: 'Please fill out all required fields.' });
    }
    if (review_text.length > 300) {
      return res.status(400).json({ success: false, message: 'Review text cannot exceed 300 characters.' });
    }
    const cleanRating = Math.min(5, Math.max(1, parseInt(rating) || 5));

    await runQuery(
      'INSERT INTO reviews (client_name, role_company, rating, review_text, status) VALUES (?, ?, ?, ?, "pending")',
      [client_name.trim(), role_company.trim(), cleanRating, review_text.trim()]
    );

    res.json({
      success: true,
      message: 'Thank you! Your review has been submitted for moderation and will appear once approved.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { client_name, role_company, rating, review_text, status } = req.body;
    if (!client_name || !role_company || !review_text) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const result = await runQuery(
      'INSERT INTO reviews (client_name, role_company, rating, review_text, status) VALUES (?, ?, ?, ?, ?)',
      [client_name, role_company, parseInt(rating) || 5, review_text, status || 'approved']
    );
    const created = await getQuery('SELECT * FROM reviews WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Review created', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/reviews/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await runQuery('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    const updated = await getQuery('SELECT * FROM reviews WHERE id = ?', [id]);
    res.json({ success: true, message: `Review status changed to ${status}`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   THEME API
   ========================================================================== */

app.get('/api/theme', async (req, res) => {
  try {
    const theme = await getQuery('SELECT * FROM theme_settings ORDER BY id DESC LIMIT 1');
    res.json({
      success: true,
      data: theme || { active_theme: 'midnight-blue', mode: 'dark' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/theme', async (req, res) => {
  try {
    const { active_theme, mode } = req.body;
    const existing = await getQuery('SELECT * FROM theme_settings ORDER BY id DESC LIMIT 1');
    if (existing) {
      await runQuery(
        'UPDATE theme_settings SET active_theme = ?, mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [active_theme || existing.active_theme, mode || existing.mode, existing.id]
      );
    } else {
      await runQuery(
        'INSERT INTO theme_settings (active_theme, mode) VALUES (?, ?)',
        [active_theme || 'midnight-blue', mode || 'dark']
      );
    }
    const updated = await getQuery('SELECT * FROM theme_settings ORDER BY id DESC LIMIT 1');
    res.json({ success: true, message: 'Theme updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   CUSTOM CONTENT BLOCKS API
   ========================================================================== */

app.get('/api/custom-content', optionalAuth, async (req, res) => {
  try {
    let query = 'SELECT * FROM custom_blocks';
    if (!req.user) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY sort_order ASC, id ASC';
    const blocks = await allQuery(query);
    res.json({ success: true, data: blocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/custom-content', authenticateToken, async (req, res) => {
  try {
    const { block_title, content_html, is_active, sort_order } = req.body;
    if (!block_title || !content_html) {
      return res.status(400).json({ success: false, message: 'Title and content HTML required' });
    }
    const result = await runQuery(
      'INSERT INTO custom_blocks (block_title, content_html, is_active, sort_order) VALUES (?, ?, ?, ?)',
      [block_title, content_html, is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM custom_blocks WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Custom block added', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/custom-content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { block_title, content_html, is_active, sort_order } = req.body;
    await runQuery(
      'UPDATE custom_blocks SET block_title = ?, content_html = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [block_title, content_html, is_active ? 1 : 0, sort_order, id]
    );
    const updated = await getQuery('SELECT * FROM custom_blocks WHERE id = ?', [id]);
    res.json({ success: true, message: 'Custom block updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/custom-content/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM custom_blocks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Custom block deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   SKILLS API ROUTES
   ========================================================================== */

app.get('/api/skills', async (req, res) => {
  try {
    const skills = await allQuery('SELECT * FROM skills ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Skill name is required' });
    }
    const result = await runQuery(
      'INSERT INTO skills (name, icon, sort_order) VALUES (?, ?, ?)',
      [name.toUpperCase(), icon || 'fa-cube', sort_order || 0]
    );
    const created = await getQuery('SELECT * FROM skills WHERE id = ?', [result.lastID]);
    res.json({ success: true, message: 'Skill created successfully', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/skills/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sort_order } = req.body;
    await runQuery(
      'UPDATE skills SET name = ?, icon = ?, sort_order = ? WHERE id = ?',
      [name ? name.toUpperCase() : '', icon || 'fa-cube', sort_order || 0, id]
    );
    const updated = await getQuery('SELECT * FROM skills WHERE id = ?', [id]);
    res.json({ success: true, message: 'Skill updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM skills WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================================================
   GENERIC UPLOAD ROUTE
   ========================================================================== */

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const isImg = req.file.mimetype.startsWith('image/');
  const folder = isImg ? 'images' : 'documents';
  const fileUrl = `/uploads/${folder}/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// Fallback route for SPA / root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 KOMAL Portfolio & CMS Server is active!`);
  console.log(`🌐 Portfolio Website: http://localhost:${PORT}`);
  console.log(`🔐 Admin Panel:      http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Default Admin:    admin / admin123`);
  console.log(`====================================================`);
});
