const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database at', dbPath);
  }
});

// Helper for promise-based queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDatabase() {
  db.serialize(async () => {
    // 1. Admin Users
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Profile Information
    db.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        title TEXT NOT NULL,
        greeting TEXT DEFAULT "Hello, I'm",
        bio TEXT NOT NULL,
        availability_status TEXT DEFAULT "AVAILABLE FOR WORK",
        profile_image TEXT,
        resume_url TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        website TEXT,
        linkedin TEXT,
        github TEXT,
        twitter TEXT,
        stats_experience TEXT DEFAULT "4+ Yrs",
        stats_projects TEXT DEFAULT "45+",
        stats_clients TEXT DEFAULT "30+",
        quote_text TEXT,
        quote_author TEXT,
        quote_role TEXT,
        footer_title TEXT,
        footer_content TEXT,
        footer_media TEXT,
        skills_tag TEXT DEFAULT "[ TECHNICAL PROFICIENCIES ]",
        skills_title TEXT DEFAULT "Core Technologies & Masteries",
        skills_desc TEXT DEFAULT "Extensive toolkit covering frontend aesthetics, 3D WebGL computation, and robust backend engineering.",
        about_tag TEXT DEFAULT "[ BACKGROUND & VISION ]",
        about_title TEXT DEFAULT "Transforming Ideas Into <span>Living Digital Art</span>",
        about_desc1 TEXT DEFAULT "With a deep passion at the intersection of graphic design, computer science, and creative engineering, I specialize in architecting interactive web applications that leave a lasting impression.",
        about_desc2 TEXT DEFAULT "Every line of code is written with performance, accessibility, and aesthetic elegance in mind.",
        process_tag TEXT DEFAULT "[ HOW I WORK ]",
        process_title TEXT DEFAULT "The 3-Step <span>Creative Workflow</span>",
        step1_num TEXT DEFAULT "01",
        step1_title TEXT DEFAULT "DISCOVER & ANALYZE",
        step1_desc TEXT DEFAULT "Deep-dive into objectives, target audience dynamics, technical constraints, and visual moodboards to establish a clear architectural roadmap.",
        step2_num TEXT DEFAULT "02",
        step2_title TEXT DEFAULT "IDEATE & PROTOTYPE",
        step2_desc TEXT DEFAULT "Iterative interactive prototyping, 3D WebGL asset experimentation, motion choreography, and high-fidelity design systems.",
        step3_num TEXT DEFAULT "03",
        step3_title TEXT DEFAULT "ENGINEER & DEPLOY",
        step3_desc TEXT DEFAULT "Full-stack implementation with clean modular code, lighthouse speed optimization, cross-device responsiveness, and continuous deployment.",
        certs_tag TEXT DEFAULT "[ ACCREDITATIONS & HONORS ]",
        certs_title TEXT DEFAULT "Verified <span>Certifications & Masteries</span>",
        certs_desc TEXT DEFAULT "Continuous growth through rigorous industry certifications and specialized masterclasses.",
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure skills header columns exist in existing database
    db.run(`ALTER TABLE profile ADD COLUMN skills_tag TEXT DEFAULT "[ TECHNICAL PROFICIENCIES ]"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN skills_title TEXT DEFAULT "Core Technologies & Masteries"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN skills_desc TEXT DEFAULT "Extensive toolkit covering frontend aesthetics, 3D WebGL computation, and robust backend engineering."`, () => {});

    // Ensure about & vision columns exist in existing database
    db.run(`ALTER TABLE profile ADD COLUMN about_tag TEXT DEFAULT "[ BACKGROUND & VISION ]"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN about_title TEXT DEFAULT "Transforming Ideas Into <span>Living Digital Art</span>"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN about_desc1 TEXT DEFAULT "With a deep passion at the intersection of graphic design, computer science, and creative engineering, I specialize in architecting interactive web applications that leave a lasting impression."`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN about_desc2 TEXT DEFAULT "Every line of code is written with performance, accessibility, and aesthetic elegance in mind."`, () => {});

    // Ensure 3-step process columns exist in existing database
    db.run(`ALTER TABLE profile ADD COLUMN process_tag TEXT DEFAULT "[ HOW I WORK ]"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN process_title TEXT DEFAULT "The 3-Step <span>Creative Workflow</span>"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step1_num TEXT DEFAULT "01"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step1_title TEXT DEFAULT "DISCOVER & ANALYZE"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step1_desc TEXT DEFAULT "Deep-dive into objectives, target audience dynamics, technical constraints, and visual moodboards to establish a clear architectural roadmap."`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step2_num TEXT DEFAULT "02"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step2_title TEXT DEFAULT "IDEATE & PROTOTYPE"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step2_desc TEXT DEFAULT "Iterative interactive prototyping, 3D WebGL asset experimentation, motion choreography, and high-fidelity design systems."`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step3_num TEXT DEFAULT "03"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step3_title TEXT DEFAULT "ENGINEER & DEPLOY"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN step3_desc TEXT DEFAULT "Full-stack implementation with clean modular code, lighthouse speed optimization, cross-device responsiveness, and continuous deployment."`, () => {});

    // Ensure certifications section header columns exist in existing database
    db.run(`ALTER TABLE profile ADD COLUMN certs_tag TEXT DEFAULT "[ ACCREDITATIONS & HONORS ]"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN certs_title TEXT DEFAULT "Verified <span>Certifications & Masteries</span>"`, () => {});
    db.run(`ALTER TABLE profile ADD COLUMN certs_desc TEXT DEFAULT "Continuous growth through rigorous industry certifications and specialized masterclasses."`, () => {});

    // 3. Services
    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price_badge TEXT,
        icon TEXT DEFAULT "fa-code",
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 4. Portfolio Projects
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        media_url TEXT,
        media_type TEXT DEFAULT "image",
        live_url TEXT,
        github_url TEXT,
        featured INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 5. Education
    db.run(`
      CREATE TABLE IF NOT EXISTS education (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        degree TEXT NOT NULL,
        institution TEXT NOT NULL,
        pass_year TEXT NOT NULL,
        grade_or_details TEXT,
        percentage TEXT DEFAULT '',
        is_ongoing INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5b. Work Experience & Career Journey
    db.run(`
      CREATE TABLE IF NOT EXISTS experience (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_title TEXT NOT NULL,
        company TEXT NOT NULL,
        badge TEXT DEFAULT "EXPERIENCE",
        duration_location TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Certifications & Awards
    db.run(`
      CREATE TABLE IF NOT EXISTS certifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        issuer TEXT NOT NULL,
        issue_date TEXT,
        credential_url TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 7. Testimonials / Reviews
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        role_company TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        review_text TEXT NOT NULL,
        status TEXT DEFAULT "pending",
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Custom Content Blocks
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_title TEXT NOT NULL,
        content_html TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 8b. Skills & Core Proficiencies
    db.run(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT "fa-cube",
        category TEXT DEFAULT "technical",
        sort_order INTEGER DEFAULT 0
      )
    `);

    // Ensure category column exists in existing database
    db.run(`ALTER TABLE skills ADD COLUMN category TEXT DEFAULT 'technical'`, () => {});

    // 9. Global Theme Settings
    db.run(`
      CREATE TABLE IF NOT EXISTS theme_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        active_theme TEXT DEFAULT "midnight-blue",
        mode TEXT DEFAULT "dark",
        hero_bg_color TEXT DEFAULT "#0b1a1c",
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure hero_bg_color column exists in existing database
    db.run(`ALTER TABLE theme_settings ADD COLUMN hero_bg_color TEXT DEFAULT "#0b1a1c"`, () => {});

    // Ensure education columns exist in existing database
    db.run(`ALTER TABLE education ADD COLUMN percentage TEXT DEFAULT ''`, () => {});
    db.run(`ALTER TABLE education ADD COLUMN is_ongoing INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE education ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

    // Seed and sync admin credentials
    try {
      const targetUser = 'komalyadav';
      const targetPass = 'komal642006';
      const hashedPassword = await bcrypt.hash(targetPass, 10);

      const existingUser = await getQuery('SELECT * FROM admin_users WHERE username = ?', [targetUser]);
      if (!existingUser) {
        // If old 'admin' exists, update it to 'komalyadav', otherwise insert new
        const oldAdmin = await getQuery('SELECT * FROM admin_users WHERE username = ?', ['admin']);
        if (oldAdmin) {
          await runQuery('UPDATE admin_users SET username = ?, password_hash = ? WHERE username = ?', [targetUser, hashedPassword, 'admin']);
        } else {
          await runQuery('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [targetUser, hashedPassword]);
        }
        console.log(`👤 Configured admin user: ${targetUser}`);
      } else {
        await runQuery('UPDATE admin_users SET password_hash = ? WHERE username = ?', [hashedPassword, targetUser]);
        console.log(`👤 Updated credentials for: ${targetUser}`);
      }
      // Remove any legacy default admin user
      await runQuery('DELETE FROM admin_users WHERE username = ?', ['admin']);

      const profileCount = await getQuery('SELECT COUNT(*) as count FROM profile');
      if (profileCount.count === 0) {
        await runQuery(`
          INSERT INTO profile (
            full_name, title, greeting, bio, availability_status,
            profile_image, resume_url, email, phone, location,
            website, linkedin, github, twitter,
            stats_experience, stats_projects, stats_clients,
            quote_text, quote_author, quote_role,
            footer_title, footer_content, footer_media
          ) VALUES (
            'Komal Yadav',
            'Creative Technologist & Full-Stack Architect',
            "Hello, I'm",
            'Crafting ultra-performance digital experiences, animated web platforms, and scalable cloud architectures with bespoke UI/UX precision.',
            'AVAILABLE FOR INTERNSHIP & CONTRACTS',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
            '/uploads/documents/sample-resume.pdf',
            'komal.creative@example.com',
            '+91 98765 43210',
            'Bangalore, India & Remote Worldwide',
            'https://komal-portfolio.dev',
            'https://linkedin.com/in/komal-yadav',
            'https://github.com/komal-dev',
            'https://twitter.com/komal_dev',
            '5+',
            '1+',
            '5+',
            'Think like an attacker. Build like a defender.',
            'Komal Yadav',
            '',
            'Ready to build something unforgettable?',
            '<p>Let’s collaborate to turn visionary ideas into groundbreaking software. Available for high-impact full-stack development, creative frontend engineering, and interactive 3D web applications.</p>',
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
          )
        `);
        console.log('🌱 Seeded default profile information');
      } else {
        // Sync stats, name, and ensure about fields are populated
        await runQuery(`
          UPDATE profile SET 
            full_name = 'Komal Yadav',
            stats_experience = '5+',
            stats_projects = '1+',
            stats_clients = '5+',
            about_tag = COALESCE(NULLIF(about_tag, ''), '[ BACKGROUND & VISION ]'),
            about_title = COALESCE(NULLIF(about_title, ''), 'Transforming Ideas Into <span>Living Digital Art</span>'),
            about_desc1 = COALESCE(NULLIF(about_desc1, ''), 'With a deep passion at the intersection of graphic design, computer science, and creative engineering, I specialize in architecting interactive web applications that leave a lasting impression.'),
            about_desc2 = COALESCE(NULLIF(about_desc2, ''), 'Every line of code is written with performance, accessibility, and aesthetic elegance in mind.'),
            process_tag = COALESCE(NULLIF(process_tag, ''), '[ HOW I WORK ]'),
            process_title = COALESCE(NULLIF(process_title, ''), 'The 3-Step <span>Creative Workflow</span>'),
            step1_num = COALESCE(NULLIF(step1_num, ''), '01'),
            step1_title = COALESCE(NULLIF(step1_title, ''), 'DISCOVER & ANALYZE'),
            step1_desc = COALESCE(NULLIF(step1_desc, ''), 'Deep-dive into objectives, target audience dynamics, technical constraints, and visual moodboards to establish a clear architectural roadmap.'),
            step2_num = COALESCE(NULLIF(step2_num, ''), '02'),
            step2_title = COALESCE(NULLIF(step2_title, ''), 'IDEATE & PROTOTYPE'),
            step2_desc = COALESCE(NULLIF(step2_desc, ''), 'Iterative interactive prototyping, 3D WebGL asset experimentation, motion choreography, and high-fidelity design systems.'),
            step3_num = COALESCE(NULLIF(step3_num, ''), '03'),
            step3_title = COALESCE(NULLIF(step3_title, ''), 'ENGINEER & DEPLOY'),
            step3_desc = COALESCE(NULLIF(step3_desc, ''), 'Full-stack implementation with clean modular code, lighthouse speed optimization, cross-device responsiveness, and continuous deployment.'),
            certs_tag = COALESCE(NULLIF(certs_tag, ''), '[ ACCREDITATIONS & HONORS ]'),
            certs_title = COALESCE(NULLIF(certs_title, ''), 'Verified <span>Certifications & Masteries</span>'),
            certs_desc = COALESCE(NULLIF(certs_desc, ''), 'Continuous growth through rigorous industry certifications and specialized masterclasses.')
          WHERE id = 1
        `).catch(() => {});
      }

      const servicesCount = await getQuery('SELECT COUNT(*) as count FROM services');
      if (servicesCount.count === 0) {
        const defaultServices = [
          {
            title: 'Creative Frontend Engineering',
            description: 'Building immersive web apps with GSAP, Three.js, responsive layouts, and buttery-smooth micro-interactions that captivate users.',
            price_badge: 'Starting $1,200',
            icon: 'fa-cubes',
            sort_order: 1
          },
          {
            title: 'Full-Stack Web Architectures',
            description: 'Engineering robust Node.js, Express, and modern DB backends with secure REST APIs, role-based auth, and scalable architecture.',
            price_badge: 'Starting $1,800',
            icon: 'fa-server',
            sort_order: 2
          },
          {
            title: 'UI/UX & Interactive Design Systems',
            description: 'Custom bespoke design systems with dark/light theming, accessible design tokens, glassmorphism, and responsive prototyping.',
            price_badge: 'Starting $950',
            icon: 'fa-palette',
            sort_order: 3
          },
          {
            title: 'Performance & 3D WebGL Optimization',
            description: 'Optimizing rendering pipelines, WebGL particle shaders, asset compression, and 100/100 Google Lighthouse benchmarks.',
            price_badge: 'Starting $800',
            icon: 'fa-bolt',
            sort_order: 4
          }
        ];

        for (const s of defaultServices) {
          await runQuery(
            'INSERT INTO services (title, description, price_badge, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
            [s.title, s.description, s.price_badge, s.icon, s.sort_order]
          );
        }
        console.log('🌱 Seeded default services');
      }

      const projectsCount = await getQuery('SELECT COUNT(*) as count FROM projects');
      if (projectsCount.count === 0) {
        const defaultProjects = [
          {
            title: 'Aetheria - 3D Metaverse Portal',
            category: 'Three.js / WebGL',
            description: 'Interactive spatial 3D showcase featuring volumetric lighting, particle storms, and real-time audio reactivity.',
            media_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80',
            media_type: 'image',
            live_url: 'https://example.com/aetheria',
            github_url: 'https://github.com/komal-dev/aetheria',
            featured: 1,
            sort_order: 1
          },
          {
            title: 'NovaPay - FinTech Banking Interface',
            category: 'Full-Stack / React',
            description: 'Modern financial analytics dashboard with animated real-time charts, automated invoicing, and multi-currency balances.',
            media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
            media_type: 'image',
            live_url: 'https://example.com/novapay',
            github_url: 'https://github.com/komal-dev/novapay',
            featured: 1,
            sort_order: 2
          },
          {
            title: 'CyberVibe - AI Generative Audio Engine',
            category: 'AI / Creative Dev',
            description: 'Neural synthesizer and ambient soundscape generator with dynamic canvas visualizers and preset sharing.',
            media_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
            media_type: 'image',
            live_url: 'https://example.com/cybervibe',
            github_url: 'https://github.com/komal-dev/cybervibe',
            featured: 1,
            sort_order: 3
          },
          {
            title: 'Zenith - Omnichannel E-Commerce CMS',
            category: 'Node.js / Express / Cloud',
            description: 'Headless e-commerce platform with blazing-fast inventory sync, Stripe billing webhooks, and custom storefront SDK.',
            media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80',
            media_type: 'image',
            live_url: 'https://example.com/zenith',
            github_url: 'https://github.com/komal-dev/zenith',
            featured: 1,
            sort_order: 4
          }
        ];

        for (const p of defaultProjects) {
          await runQuery(
            'INSERT INTO projects (title, category, description, media_url, media_type, live_url, github_url, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [p.title, p.category, p.description, p.media_url, p.media_type, p.live_url, p.github_url, p.featured, p.sort_order]
          );
        }
        console.log('🌱 Seeded default portfolio projects');
      }

      const eduCount = await getQuery('SELECT COUNT(*) as count FROM education');
      if (eduCount.count === 0) {
        const defaultEdu = [
          {
            degree: 'Master of Science in Computer Science & Interactive Media',
            institution: 'National Institute of Technology (NIT)',
            pass_year: '2023 - 2025',
            grade_or_details: 'GPA 3.9/4.0 • Specialization in Computer Graphics, WebGL, Distributed Cloud Systems.',
            sort_order: 1
          },
          {
            degree: 'Bachelor of Technology in Information Technology',
            institution: 'Apex Institute of Engineering & Technology',
            pass_year: '2019 - 2023',
            grade_or_details: 'First Class with Distinction • Led Developer Student Club & Hackathon Winner.',
            sort_order: 2
          }
        ];

        for (const e of defaultEdu) {
          await runQuery(
            'INSERT INTO education (degree, institution, pass_year, grade_or_details, sort_order) VALUES (?, ?, ?, ?, ?)',
            [e.degree, e.institution, e.pass_year, e.grade_or_details, e.sort_order]
          );
        }
        console.log('🌱 Seeded default education');
      } else {
        try {
          await runQuery(`UPDATE education SET is_ongoing = 1, pass_year = '2024 - 2027', degree = 'Bachelor of Computer Applications', institution = 'CSJM University, Kanpur' WHERE id = 1`);
          await runQuery(`UPDATE education SET percentage = '76%', grade_or_details = '76%', degree = 'Intermediate', institution = 'CBSE Board', pass_year = '2023 - 2024' WHERE id = 2`);
          await runQuery(`UPDATE education SET percentage = '81%', grade_or_details = '81%', degree = 'High School', institution = 'CBSE Board', pass_year = '2021 - 2022' WHERE id = 3`);
        } catch (e) {}
      }

      const certsCount = await getQuery('SELECT COUNT(*) as count FROM certifications');
      if (certsCount.count === 0) {
        const defaultCerts = [
          {
            title: 'AWS Certified Solutions Architect – Associate',
            issuer: 'Amazon Web Services',
            issue_date: '2024',
            credential_url: 'https://aws.amazon.com/verification',
            image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
            sort_order: 1
          },
          {
            title: 'Three.js Journey Master Certification',
            issuer: 'Bruno Simon / Creative Dev Academy',
            issue_date: '2023',
            credential_url: 'https://threejs-journey.com',
            image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
            sort_order: 2
          },
          {
            title: 'Meta Professional Frontend Architect',
            issuer: 'Meta & Coursera',
            issue_date: '2023',
            credential_url: 'https://coursera.org/verify/meta',
            image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
            sort_order: 3
          }
        ];

        for (const c of defaultCerts) {
          await runQuery(
            'INSERT INTO certifications (title, issuer, issue_date, credential_url, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [c.title, c.issuer, c.issue_date, c.credential_url, c.image_url, c.sort_order]
          );
        }
        console.log('🌱 Seeded default certifications');
      }

      const reviewsCount = await getQuery('SELECT COUNT(*) as count FROM reviews');
      if (reviewsCount.count === 0) {
        const defaultReviews = [
          {
            client_name: 'Alexander Wright',
            role_company: 'CTO, Horizon Digital Studios',
            rating: 5,
            review_text: 'Komal delivered an extraordinary web application with mind-blowing animations. The smooth GSAP transitions and Three.js elements elevated our conversion rate by 140%.',
            status: 'approved'
          },
          {
            client_name: 'Elena Rostova',
            role_company: 'Head of Product, CyberSphere Ventures',
            rating: 5,
            review_text: 'Working with Komal was seamless from discovery to deployment. Absolute mastery over full-stack engineering and modern UI aesthetics.',
            status: 'approved'
          },
          {
            client_name: 'Marcus Chen',
            role_company: 'Founder, Velocity AI Labs',
            rating: 5,
            review_text: 'Top-tier code quality, high performance, and unmatched creative execution. The custom CMS panel makes managing our portfolio ridiculously easy.',
            status: 'approved'
          },
          {
            client_name: 'Sarah Jenkins',
            role_company: 'Design Director, Apex Creative',
            rating: 5,
            review_text: 'Incredible attention to detail in animations, responsiveness, and dark mode themes! Highly recommended!',
            status: 'pending'
          }
        ];

        for (const r of defaultReviews) {
          await runQuery(
            'INSERT INTO reviews (client_name, role_company, rating, review_text, status) VALUES (?, ?, ?, ?, ?)',
            [r.client_name, r.role_company, r.rating, r.review_text, r.status]
          );
        }
        console.log('🌱 Seeded default reviews');
      }

      const themeCount = await getQuery('SELECT COUNT(*) as count FROM theme_settings');
      if (themeCount.count === 0) {
        await runQuery(
          'INSERT INTO theme_settings (active_theme, mode) VALUES (?, ?)',
          ['midnight-blue', 'dark']
        );
        console.log('🌱 Seeded default theme setting: midnight-blue');
      }

      const customBlocksCount = await getQuery('SELECT COUNT(*) as count FROM custom_blocks');
      if (customBlocksCount.count === 0) {
        await runQuery(
          'INSERT INTO custom_blocks (block_title, content_html, is_active, sort_order) VALUES (?, ?, ?, ?)',
          [
            'Open Source & Community Highlights',
            '<div class="custom-spotlight-card"><div class="badge">🚀 COMMUNITY CONTRIBUTION</div><h3>Active Contributor to Modern Web Standards</h3><p>Passionate about open-source tools, GSAP interactive widgets, WebGL shader libraries, and mentoring emerging developers in creative coding.</p></div>',
            1,
            1
          ]
        );
        console.log('🌱 Seeded default custom block');
      }

      const skillsCount = await getQuery('SELECT COUNT(*) as count FROM skills');
      if (skillsCount.count === 0) {
        const defaultSkills = [
          // Technical Skills
          { name: 'PYTHON', icon: 'fab fa-python', category: 'technical', sort_order: 1 },
          { name: 'AI – ASSISTED DEVELOPMENT (VIBE CODING)', icon: 'fas fa-wand-magic-sparkles', category: 'technical', sort_order: 2 },
          { name: 'GIT/GITHUB', icon: 'fab fa-github', category: 'technical', sort_order: 3 },
          { name: 'POWER BI', icon: 'fas fa-chart-pie', category: 'technical', sort_order: 4 },
          { name: 'HTML/CSS/JAVASCRIPT', icon: 'fab fa-code', category: 'technical', sort_order: 5 },
          // Soft Skills
          { name: 'COMMUNICATION', icon: 'fas fa-comments', category: 'soft', sort_order: 6 },
          { name: 'TEAMWORK', icon: 'fas fa-people-group', category: 'soft', sort_order: 7 },
          { name: 'LEADERSHIP', icon: 'fas fa-crown', category: 'soft', sort_order: 8 },
          { name: 'TIME MANAGEMENT', icon: 'fas fa-clock', category: 'soft', sort_order: 9 },
          { name: 'QUICK LEARNING', icon: 'fas fa-bolt', category: 'soft', sort_order: 10 }
        ];

        for (const sk of defaultSkills) {
          await runQuery(
            'INSERT INTO skills (name, icon, category, sort_order) VALUES (?, ?, ?, ?)',
            [sk.name, sk.icon, sk.category, sk.sort_order]
          );
        }
        console.log('🌱 Seeded default technical & soft skills');
      }

      const expCount = await getQuery('SELECT COUNT(*) as count FROM experience');
      if (expCount.count === 0) {
        const defaultExperience = [
          {
            badge: 'MASTER CLASS',
            role_title: 'Cybersecurity Analyst Intern',
            company: 'WSCUBE Tech / Tech Training',
            duration_location: '2024 • online',
            description: 'Learn fundaments of Networking and Cyber security.',
            tags: 'Networking Fundaments, TCP/IP models, Cybersecurity Fundamentals',
            sort_order: 1
          },
          {
            badge: 'LEADERSHIP',
            role_title: 'Technical & Development Lead',
            company: 'Academic & Hackathon Projects',
            duration_location: '2023 - Present • Kanpur, UP',
            description: 'Led end-to-end full-stack development and UI architecture for Khojbeen.ai Lost & Found platform and modern responsive portfolio systems.',
            tags: 'JavaScript, Node.js, Express, MongoDB, HTML5/CSS3, Git',
            sort_order: 2
          },
          {
            badge: 'HACKATHON',
            role_title: 'AI Hackathon Team Member & Lead',
            company: 'Hack India & CSJMU Fests',
            duration_location: '2024 - 2026 • Kanpur, UP',
            description: 'Participated in 3+ Hackathons as a Team Member and Leader, attending International Conferences on AI and building real-world software solutions.',
            tags: 'Python, AI Development, Team Leadership, Vibe Coding',
            sort_order: 3
          }
        ];

        for (const e of defaultExperience) {
          await runQuery(
            'INSERT INTO experience (role_title, company, badge, duration_location, description, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [e.role_title, e.company, e.badge, e.duration_location, e.description, e.tags, e.sort_order]
          );
        }
        console.log('🌱 Seeded default work experience records');
      }
    } catch (e) {
      console.error('Error seeding data:', e);
    }
  });
}

initDatabase();

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery
};
