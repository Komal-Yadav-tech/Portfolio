/**
 * CMS Admin Panel State Management & API Handlers
 */

const THEMES_CONFIG = [
  { id: 'midnight-blue', name: 'Midnight Blue', desc: 'Deep sapphire, cobalt glow, cyan accents', colors: ['#060913', '#38bdf8', '#6366f1'] },
  { id: 'crimson-rudra', name: 'Crimson Rudra', desc: 'Velvet obsidian, fierce scarlet, blood orange', colors: ['#0d0406', '#f43f5e', '#ff5925'] },
  { id: 'emerald-dark', name: 'Emerald Dark', desc: 'Deep forest obsidian, neon jade, mint', colors: ['#030d08', '#10b981', '#14b8a6'] },
  { id: 'sunset-pink', name: 'Sunset Pink', desc: 'Dusk violet, hot magenta, solar coral', colors: ['#0f0514', '#ec4899', '#f97316'] },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon yellow, electric cyan, deep purple', colors: ['#09090e', '#facc15', '#06b6d4'] },
  { id: 'royal-purple', name: 'Royal Purple', desc: 'Imperial amethyst, radiant violet, lavender', colors: ['#090514', '#a855f7', '#8b5cf6'] },
  { id: 'golden-amber', name: 'Golden Amber', desc: 'Rich onyx, warm champagne gold, luminous bronze', colors: ['#0d0a04', '#f59e0b', '#fbbf24'] },
  { id: 'slate-steel', name: 'Slate Steel', desc: 'Titanium gray, frosted platinum, arctic blue', colors: ['#0b0f14', '#94a3b8', '#cbd5e1'] },
  { id: 'rose-gold', name: 'Rose Gold', desc: 'Blush metallic, warm copper, champagne glow', colors: ['#0f080a', '#fb7185', '#fda4af'] },
  { id: 'ocean-teal', name: 'Ocean Teal', desc: 'Abyssal deep blue, seafoam teal, aquamarine', colors: ['#030e12', '#14b8a6', '#06b6d4'] },
  { id: 'forest-lime', name: 'Forest Lime', desc: 'Dark olive/jungle black, hyper lime, chartreuse', colors: ['#070d04', '#84cc16', '#a3e635'] },
  { id: 'deep-space', name: 'Deep Space', desc: 'Stellar black, cosmic indigo, starlight silver', colors: ['#040407', '#818cf8', '#c084fc'] }
];

let currentUser = null;
let currentReviewFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  initLoginHandler();
  initTabNavigation();
  initForms();
  renderThemesGrid();
  await checkAuthSession();
});

/* ==========================================================================
   AUTH & SESSION
   ========================================================================== */

async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      hideLoginScreen();
      loadAllAdminData();
    } else {
      showLoginScreen();
    }
  } catch (err) {
    showLoginScreen();
  }
}

function initLoginHandler() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        currentUser = data.user;
        showToast('Login successful!');
        hideLoginScreen();
        loadAllAdminData();
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Network or server error', 'error');
    }
  });

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      showToast('Logged out');
      showLoginScreen();
    });
  }
}

function showLoginScreen() {
  const s = document.getElementById('admin-login-screen');
  if (s) s.style.display = 'flex';
}

function hideLoginScreen() {
  const s = document.getElementById('admin-login-screen');
  if (s) s.style.display = 'none';
  const pill = document.getElementById('admin-user-pill');
  if (pill && currentUser) {
    pill.innerHTML = `<i class="fas fa-circle-user"></i> ${currentUser.username}`;
  }
}

/* ==========================================================================
   NAVIGATION & TABS
   ========================================================================== */

function initTabNavigation() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab-btn').forEach((b) => {
    if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.querySelectorAll('.tab-panel').forEach((p) => {
    if (p.id === `tab-${tabId}`) p.classList.add('active');
    else p.classList.remove('active');
  });

  // Update header titles
  const titles = {
    overview: ['Dashboard Overview', 'Real-time overview of content and activities'],
    profile: ['Profile & Bio Settings', 'Manage your personal details, avatar image, and resume CV'],
    skills: ['Skills & Technologies', 'Manage the infinite dynamic skills marquee displayed on portfolio'],
    projects: ['Portfolio Projects', 'Manage showcase items, media files, and live links'],
    education: ['Academic Education', 'Manage degrees, institutions, and graduation records'],
    certifications: ['Certifications & Awards', 'Manage accredited certificates and badge media'],
    reviews: ['Reviews Moderation', 'Approve, reject, or manage client feedback submissions'],
    themes: ['12 Luxury Dynamic Themes', 'Select and switch real-time site color palettes'],
    'quote-process': ['Inspirational Quote Box', 'Configure the middle section quote and signature'],
    'custom-blocks': ['Custom HTML Blocks', 'Inject custom HTML blocks into the portfolio'],
    'footer-box': ['Footer Highlight Box', 'Customize the interactive highlight card in the footer']
  };

  const [t, sub] = titles[tabId] || ['Dashboard', ''];
  const titleEl = document.getElementById('tab-heading-title');
  const subEl = document.getElementById('tab-heading-subtitle');
  if (titleEl) titleEl.textContent = t;
  if (subEl) subEl.textContent = sub;
}

/* ==========================================================================
   LOAD ALL DATA
   ========================================================================== */

async function loadAllAdminData() {
  await Promise.allSettled([
    loadProfileData(),
    loadSkills(),
    loadProjects(),
    loadEducation(),
    loadCertifications(),
    loadReviews(),
    loadThemeSetting(),
    loadCustomBlocks()
  ]);
}

/* ==========================================================================
   PROFILE & BIO FORM
   ========================================================================== */

async function loadProfileData() {
  try {
    const res = await fetch('/api/profile');
    const result = await res.json();
    if (!result.success || !result.data) return;
    const p = result.data;

    document.getElementById('p-full-name').value = p.full_name || '';
    document.getElementById('p-title').value = p.title || '';
    document.getElementById('p-greeting').value = p.greeting || '';
    document.getElementById('p-avail').value = p.availability_status || '';
    document.getElementById('p-bio').value = p.bio || '';
    document.getElementById('p-avatar-url').value = p.profile_image || '';
    document.getElementById('p-resume-url').value = p.resume_url || '';

    const avatarPreview = document.getElementById('p-avatar-preview');
    if (avatarPreview && p.profile_image) avatarPreview.src = p.profile_image;

    const resumeStatus = document.getElementById('p-resume-status');
    if (resumeStatus) {
      resumeStatus.innerHTML = p.resume_url
        ? `Current Resume: <a href="${p.resume_url}" target="_blank" style="color: var(--admin-accent); text-decoration: underline;">Test Download Link</a>`
        : 'No resume uploaded yet';
    }

    document.getElementById('p-stat-exp').value = p.stats_experience || '';
    document.getElementById('p-stat-proj').value = p.stats_projects || '';
    document.getElementById('p-stat-clients').value = p.stats_clients || '';

    document.getElementById('p-email').value = p.email || '';
    document.getElementById('p-phone').value = p.phone || '';
    document.getElementById('p-location').value = p.location || '';
    document.getElementById('p-linkedin').value = p.linkedin || '';
    document.getElementById('p-github').value = p.github || '';
    document.getElementById('p-twitter').value = p.twitter || '';

    // Quote
    document.getElementById('q-text').value = p.quote_text || '';
    document.getElementById('q-author').value = p.quote_author || '';
    document.getElementById('q-role').value = p.quote_role || '';

    // Footer Box
    document.getElementById('fb-title').value = p.footer_title || '';
    document.getElementById('fb-content').value = p.footer_content || '';

    // Skills Section Header
    const skTagInput = document.getElementById('sk-sec-tag');
    if (skTagInput) skTagInput.value = p.skills_tag || '[ TECHNICAL PROFICIENCIES ]';
    const skTitleInput = document.getElementById('sk-sec-title');
    if (skTitleInput) skTitleInput.value = p.skills_title || 'Core Technologies & <span>Masteries</span>';
    const skDescInput = document.getElementById('sk-sec-desc');
    if (skDescInput) skDescInput.value = p.skills_desc || '';
  } catch (err) {
    console.error('Error loading profile data:', err);
  }
}

function initForms() {
  // Profile Update Form
  const profileForm = document.getElementById('profile-update-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(profileForm);

      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          body: formData
        });
        const result = await res.json();
        if (result.success) {
          showToast('Profile updated successfully!');
          loadProfileData();
        } else {
          showToast(result.message || 'Update failed', 'error');
        }
      } catch (err) {
        showToast('Error saving profile', 'error');
      }
    });
  }

  // Skills Section Header Form
  const skillsHeaderForm = document.getElementById('skills-header-form');
  if (skillsHeaderForm) {
    skillsHeaderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('skills_tag', document.getElementById('sk-sec-tag').value);
      formData.append('skills_title', document.getElementById('sk-sec-title').value);
      formData.append('skills_desc', document.getElementById('sk-sec-desc').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) {
          showToast('Skills section header updated!');
          loadProfileData();
        } else {
          showToast(result.message || 'Update failed', 'error');
        }
      } catch (err) {
        showToast('Error updating skills header', 'error');
      }
    });
  }

  // Quote Update Form
  const quoteForm = document.getElementById('quote-update-form');
  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('quote_text', document.getElementById('q-text').value);
      formData.append('quote_author', document.getElementById('q-author').value);
      formData.append('quote_role', document.getElementById('q-role').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) showToast('Quote box updated!');
      } catch (err) {
        showToast('Error updating quote', 'error');
      }
    });
  }

  // Footer Box Form
  const footerForm = document.getElementById('footer-box-form');
  if (footerForm) {
    footerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('footer_title', document.getElementById('fb-title').value);
      formData.append('footer_content', document.getElementById('fb-content').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) showToast('Footer box updated!');
      } catch (err) {
        showToast('Error updating footer box', 'error');
      }
    });
  }
}

/* ==========================================================================
   SKILLS CRUD
   ========================================================================== */

window.skillsData = [];

async function loadSkills() {
  try {
    const res = await fetch('/api/skills');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.skillsData = list;

    const countEl = document.getElementById('count-skills');
    if (countEl) countEl.textContent = list.length;

    const tbody = document.getElementById('skills-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((s) => `
      <tr>
        <td><i class="${s.icon || 'fas fa-cube'}" style="color: var(--admin-accent); font-size: 1.25rem;"></i></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.sort_order}</td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick='openEditSkillById(${s.id})'><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteSkill(${s.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading skills:', err);
  }
}

function openEditSkillById(id) {
  const s = (window.skillsData || []).find(item => item.id == id);
  if (!s) return;
  openEditSkillModal(s);
}

function openAddSkillModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Skill / Technology</h3>
    <form id="add-skill-form">
      <div class="form-group">
        <label class="form-label">Skill Name *</label>
        <input type="text" id="sk-name" class="form-control" placeholder="e.g. REACT & NEXT.JS" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">FontAwesome Icon Class</label>
          <input type="text" id="sk-icon" class="form-control" placeholder="fab fa-react" value="fas fa-cube">
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="sk-order" class="form-control" value="0">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Add Skill</button>
    </form>
  `);

  document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('sk-name').value.trim(),
      icon: document.getElementById('sk-icon').value.trim(),
      sort_order: parseInt(document.getElementById('sk-order').value) || 0
    };
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Skill added successfully!');
      closeCrudModal();
      loadSkills();
    } else {
      showToast(result.message || 'Failed to add skill', 'error');
    }
  });
}

function openEditSkillModal(s) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Skill / Technology</h3>
    <form id="edit-skill-form">
      <div class="form-group">
        <label class="form-label">Skill Name *</label>
        <input type="text" id="esk-name" class="form-control" value="${s.name}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">FontAwesome Icon Class</label>
          <input type="text" id="esk-icon" class="form-control" value="${s.icon || 'fas fa-cube'}">
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="esk-order" class="form-control" value="${s.sort_order}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('esk-name').value.trim(),
      icon: document.getElementById('esk-icon').value.trim(),
      sort_order: parseInt(document.getElementById('esk-order').value) || 0
    };
    const res = await fetch(`/api/skills/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Skill updated!');
      closeCrudModal();
      loadSkills();
    } else {
      showToast(result.message || 'Failed to update skill', 'error');
    }
  });
}

async function deleteSkill(id) {
  if (!confirm('Are you sure you want to delete this skill?')) return;
  const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Skill deleted');
    loadSkills();
  }
}

/* ==========================================================================
   PROJECTS CRUD
   ========================================================================== */

window.projectsData = [];

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.projectsData = list;

    document.getElementById('count-projects').textContent = list.length;
    const tbody = document.getElementById('projects-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((p) => `
      <tr>
        <td>${p.media_url ? `<img src="${p.media_url}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" alt="${p.title}">` : `<div style="width:50px; height:35px; background: rgba(255,255,255,0.06); border-radius:4px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-folder"></i></div>`}</td>
        <td><strong>${p.title}</strong></td>
        <td><span class="status-badge approved">${p.category}</span></td>
        <td>${p.featured ? '⭐ Yes' : 'No'}</td>
        <td>
          ${p.live_url ? `<a href="${p.live_url}" target="_blank" style="color: var(--admin-accent);"><i class="fas fa-external-link-alt"></i></a> ` : ''}
          ${p.github_url ? `<a href="${p.github_url}" target="_blank" style="color: var(--admin-text-sub);"><i class="fab fa-github"></i></a>` : ''}
        </td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick="openEditProjectById(${p.id})"><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

function openEditProjectById(id) {
  const p = (window.projectsData || []).find(item => item.id == id);
  if (!p) return;
  openEditProjectModal(p);
}

function openAddProjectModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Portfolio Project</h3>
    <form id="add-project-form" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label">Project Title *</label>
        <input type="text" name="title" class="form-control" placeholder="e.g. Aetheria Metaverse" required>
      </div>
      <div class="form-group">
        <label class="form-label">Category *</label>
        <input type="text" name="category" class="form-control" placeholder="Three.js / WebGL / Full-Stack" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description" class="form-control" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Thumbnail Image File (Upload)</label>
        <input type="file" name="media_file" accept="image/*" class="form-control">
        <input type="text" name="media_url" class="form-control" placeholder="Or paste image URL" style="margin-top: 0.5rem;">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Live URL</label>
          <input type="url" name="live_url" class="form-control" placeholder="https://...">
        </div>
        <div class="form-group">
          <label class="form-label">GitHub URL</label>
          <input type="url" name="github_url" class="form-control" placeholder="https://github.com/...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Featured?</label>
          <select name="featured" class="form-control">
            <option value="1">Yes (Featured)</option>
            <option value="0">No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" name="sort_order" class="form-control" value="0">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Project</button>
    </form>
  `);

  document.getElementById('add-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('add-project-form'));
    const res = await fetch('/api/projects', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      showToast('Project added!');
      closeCrudModal();
      loadProjects();
    }
  });
}

function openEditProjectModal(p) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Project</h3>
    <form id="edit-project-form" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label">Project Title *</label>
        <input type="text" name="title" class="form-control" value="${p.title}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Category *</label>
        <input type="text" name="category" class="form-control" value="${p.category}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description" class="form-control" rows="3">${p.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Thumbnail Image</label>
        <input type="file" name="media_file" accept="image/*" class="form-control">
        <input type="text" name="media_url" class="form-control" value="${p.media_url || ''}" style="margin-top: 0.5rem;">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Live URL</label>
          <input type="url" name="live_url" class="form-control" value="${p.live_url || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">GitHub URL</label>
          <input type="url" name="github_url" class="form-control" value="${p.github_url || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Featured?</label>
          <select name="featured" class="form-control">
            <option value="1" ${p.featured ? 'selected' : ''}>Yes</option>
            <option value="0" ${!p.featured ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" name="sort_order" class="form-control" value="${p.sort_order}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('edit-project-form'));
    const res = await fetch(`/api/projects/${p.id}`, { method: 'PUT', body: formData });
    const result = await res.json();
    if (result.success) {
      showToast('Project updated!');
      closeCrudModal();
      loadProjects();
    }
  });
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Project deleted');
    loadProjects();
  }
}

/* ==========================================================================
   EDUCATION CRUD
   ========================================================================== */

async function loadEducation() {
  try {
    const res = await fetch('/api/education');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];

    const countEdu = document.getElementById('count-education');
    if (countEdu) countEdu.textContent = list.length;

    const tbody = document.getElementById('education-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((e) => `
      <tr>
        <td><strong>${e.degree}</strong></td>
        <td>${e.institution}</td>
        <td><span class="status-badge approved">${e.pass_year}</span></td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick='openEditEducationModal(${JSON.stringify(e)})'><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteEducation(${e.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading education:', err);
  }
}

function openAddEducationModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Academic Qualification</h3>
    <form id="add-edu-form">
      <div class="form-group">
        <label class="form-label">Degree / Qualification *</label>
        <input type="text" id="edu-degree" class="form-control" required placeholder="Master of Science...">
      </div>
      <div class="form-group">
        <label class="form-label">Institution / University *</label>
        <input type="text" id="edu-inst" class="form-control" required placeholder="NIT / University">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Passing Year / Duration *</label>
          <input type="text" id="edu-year" class="form-control" placeholder="2023 - 2025" required>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="edu-order" class="form-control" value="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Grade / Highlights</label>
        <textarea id="edu-details" class="form-control" rows="2"></textarea>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Qualification</button>
    </form>
  `);

  document.getElementById('add-edu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      degree: document.getElementById('edu-degree').value,
      institution: document.getElementById('edu-inst').value,
      pass_year: document.getElementById('edu-year').value,
      grade_or_details: document.getElementById('edu-details').value,
      sort_order: parseInt(document.getElementById('edu-order').value) || 0
    };
    const res = await fetch('/api/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Education record added!');
      closeCrudModal();
      loadEducation();
    }
  });
}

function openEditEducationModal(e) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Qualification</h3>
    <form id="edit-edu-form">
      <div class="form-group">
        <label class="form-label">Degree / Qualification *</label>
        <input type="text" id="e-edu-degree" class="form-control" value="${e.degree}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Institution *</label>
        <input type="text" id="e-edu-inst" class="form-control" value="${e.institution}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Passing Year *</label>
          <input type="text" id="e-edu-year" class="form-control" value="${e.pass_year}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="e-edu-order" class="form-control" value="${e.sort_order}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Grade / Highlights</label>
        <textarea id="e-edu-details" class="form-control" rows="2">${e.grade_or_details || ''}</textarea>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-edu-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const body = {
      degree: document.getElementById('e-edu-degree').value,
      institution: document.getElementById('e-edu-inst').value,
      pass_year: document.getElementById('e-edu-year').value,
      grade_or_details: document.getElementById('e-edu-details').value,
      sort_order: parseInt(document.getElementById('e-edu-order').value) || 0
    };
    const res = await fetch(`/api/education/${e.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Education updated!');
      closeCrudModal();
      loadEducation();
    }
  });
}

async function deleteEducation(id) {
  if (!confirm('Delete this education record?')) return;
  const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Education deleted');
    loadEducation();
  }
}

/* ==========================================================================
   CERTIFICATIONS CRUD
   ========================================================================== */

window.certificationsData = [];

async function loadCertifications() {
  try {
    const res = await fetch('/api/certifications');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.certificationsData = list;

    document.getElementById('count-certs').textContent = list.length;
    const tbody = document.getElementById('certs-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((c) => `
      <tr>
        <td>${c.image_url ? `<img src="${c.image_url}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" alt="${c.title}">` : `<div style="width:50px; height:35px; background: rgba(255,255,255,0.06); border-radius:4px; display:flex; align-items:center; justify-content:center; color:var(--admin-accent);"><i class="fas fa-certificate"></i></div>`}</td>
        <td><strong>${c.title}</strong></td>
        <td>${c.issuer}</td>
        <td><span class="status-badge approved">${c.issue_date || 'N/A'}</span></td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick="openEditCertById(${c.id})"><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteCert(${c.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading certifications:', err);
  }
}

function openEditCertById(id) {
  const c = (window.certificationsData || []).find(item => item.id == id);
  if (!c) return;
  openEditCertModal(c);
}

function openAddCertModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Certification</h3>
    <form id="add-cert-form" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label">Certification Title *</label>
        <input type="text" name="title" class="form-control" required placeholder="e.g. Cybersecurity Specialist">
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Organization *</label>
        <input type="text" name="issuer" class="form-control" required placeholder="e.g. Infosys / Google / IBM">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Issue Date / Year</label>
          <input type="text" name="issue_date" class="form-control" placeholder="e.g. August 2026">
        </div>
        <div class="form-group">
          <label class="form-label">Credential Verification URL</label>
          <input type="url" name="credential_url" class="form-control" placeholder="https://...">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Upload Certificate Image / Badge</label>
        <input type="file" name="image_file" accept="image/*" class="form-control">
        <input type="text" name="image_url" class="form-control" placeholder="Or paste Image URL" style="margin-top: 0.5rem;">
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Certification</button>
    </form>
  `);

  document.getElementById('add-cert-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('add-cert-form'));
    const res = await fetch('/api/certifications', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      showToast('Certification added!');
      closeCrudModal();
      loadCertifications();
    }
  });
}

function openEditCertModal(c) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Certification</h3>
    <form id="edit-cert-form" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label">Certification Title *</label>
        <input type="text" name="title" class="form-control" value="${c.title ? c.title.replace(/"/g, '&quot;') : ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Organization *</label>
        <input type="text" name="issuer" class="form-control" value="${c.issuer ? c.issuer.replace(/"/g, '&quot;') : ''}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Issue Date</label>
          <input type="text" name="issue_date" class="form-control" value="${c.issue_date || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Credential Verification URL</label>
          <input type="url" name="credential_url" class="form-control" value="${c.credential_url || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Certificate Badge Image</label>
        ${c.image_url ? `<div style="margin-bottom:0.6rem;"><span style="font-size:0.75rem; color:var(--admin-text-sub);">Current image preview:</span><br><img src="${c.image_url}" style="max-height: 75px; border-radius: 6px; margin-top: 4px; object-fit: cover;"></div>` : ''}
        <input type="file" name="image_file" accept="image/*" class="form-control">
        <input type="text" name="image_url" class="form-control" value="${c.image_url || ''}" placeholder="Or image URL" style="margin-top: 0.5rem;">
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-cert-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('edit-cert-form'));
    const res = await fetch(`/api/certifications/${c.id}`, { method: 'PUT', body: formData });
    const result = await res.json();
    if (result.success) {
      showToast('Certification updated!');
      closeCrudModal();
      loadCertifications();
    }
  });
}

async function deleteCert(id) {
  if (!confirm('Delete this certification?')) return;
  const res = await fetch(`/api/certifications/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Certification deleted');
    loadCertifications();
  }
}

/* ==========================================================================
   REVIEWS MODERATION
   ========================================================================== */

async function loadReviews(status = currentReviewFilter) {
  try {
    const url = status && status !== 'all' ? `/api/reviews?status=${status}` : '/api/reviews?status=all';
    const res = await fetch(url);
    const result = await res.json();
    if (!result.success) return;

    const list = result.data || [];
    const pendingCount = result.pendingCount !== undefined ? result.pendingCount : 0;

    // Update Badges
    document.getElementById('count-pending-reviews').textContent = pendingCount;
    const navBadge = document.getElementById('pending-reviews-badge');
    if (navBadge) {
      if (pendingCount > 0) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = pendingCount;
      } else {
        navBadge.style.display = 'none';
      }
    }

    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((r) => `
      <tr>
        <td><strong>${r.client_name}</strong></td>
        <td>${r.role_company}</td>
        <td>${'⭐'.repeat(r.rating || 5)}</td>
        <td><div style="font-size: 0.85rem; max-width: 280px;">${r.review_text}</div></td>
        <td><span class="status-badge ${r.status}">${r.status}</span></td>
        <td>
          <div class="table-actions">
            ${r.status !== 'approved' ? `<button class="admin-btn admin-btn-success" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;" onclick="setReviewStatus(${r.id}, 'approved')"><i class="fas fa-check"></i> Approve</button>` : ''}
            ${r.status !== 'rejected' ? `<button class="admin-btn admin-btn-outline" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;" onclick="setReviewStatus(${r.id}, 'rejected')"><i class="fas fa-ban"></i> Reject</button>` : ''}
            <button class="admin-btn admin-btn-danger" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;" onclick="deleteReview(${r.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

function filterReviews(status, btn) {
  currentReviewFilter = status;
  document.querySelectorAll('.filter-tab-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadReviews(status);
}

async function setReviewStatus(id, status) {
  try {
    const res = await fetch(`/api/reviews/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Review marked as ${status}`);
      loadReviews();
    }
  } catch (err) {
    showToast('Status update failed', 'error');
  }
}

async function deleteReview(id) {
  if (!confirm('Delete this review permanently?')) return;
  const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Review deleted');
    loadReviews();
  }
}

function openAddReviewModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Verified Review</h3>
    <form id="add-manual-review-form">
      <div class="form-group">
        <label class="form-label">Client Name *</label>
        <input type="text" id="mr-name" class="form-control" required placeholder="Elena Rostova">
      </div>
      <div class="form-group">
        <label class="form-label">Role & Company *</label>
        <input type="text" id="mr-role" class="form-control" required placeholder="Head of Product, CyberSphere">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Rating (1-5)</label>
          <select id="mr-rating" class="form-control">
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars</option>
            <option value="3">⭐⭐⭐ 3 Stars</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="mr-status" class="form-control">
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Review Testimonial Text *</label>
        <textarea id="mr-text" class="form-control" rows="3" required></textarea>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Publish Review</button>
    </form>
  `);

  document.getElementById('add-manual-review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      client_name: document.getElementById('mr-name').value,
      role_company: document.getElementById('mr-role').value,
      rating: parseInt(document.getElementById('mr-rating').value),
      status: document.getElementById('mr-status').value,
      review_text: document.getElementById('mr-text').value
    };
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Review added!');
      closeCrudModal();
      loadReviews();
    }
  });
}

/* ==========================================================================
   12 LUXURY THEMES SWITCHER
   ========================================================================== */

function renderThemesGrid(activeId = 'midnight-blue') {
  const container = document.getElementById('themes-grid');
  if (!container) return;

  container.innerHTML = THEMES_CONFIG.map((t) => `
    <div class="theme-card-option ${t.id === activeId ? 'active' : ''}" onclick="selectTheme('${t.id}')">
      <div class="theme-swatches">
        <div style="background: ${t.colors[0]};"></div>
        <div style="background: ${t.colors[1]};"></div>
        <div style="background: ${t.colors[2]};"></div>
      </div>
      <div class="theme-card-name">${t.name}</div>
      <div class="theme-card-desc">${t.desc}</div>
      ${t.id === activeId ? '<span style="position: absolute; top: 8px; right: 8px; color: var(--admin-accent);"><i class="fas fa-circle-check"></i> Active</span>' : ''}
    </div>
  `).join('');
}

async function loadThemeSetting() {
  try {
    const res = await fetch('/api/theme');
    const result = await res.json();
    if (result.success && result.data) {
      renderThemesGrid(result.data.active_theme || 'midnight-blue');
    }
  } catch (err) {
    console.error('Error loading theme:', err);
  }
}

async function selectTheme(themeId) {
  try {
    const res = await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_theme: themeId })
    });
    const result = await res.json();
    if (result.success) {
      document.documentElement.setAttribute('data-theme', themeId);
      localStorage.setItem('komal_portfolio_theme', themeId);
      localStorage.setItem('komal_portfolio_theme_override', 'true');
      showToast(`Global theme updated to ${themeId.replace(/-/g, ' ').toUpperCase()}!`);
      renderThemesGrid(themeId);
    }
  } catch (err) {
    showToast('Failed to update theme', 'error');
  }
}

/* ==========================================================================
   CUSTOM CONTENT BLOCKS CRUD
   ========================================================================== */

async function loadCustomBlocks() {
  try {
    const res = await fetch('/api/custom-content');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];

    const tbody = document.getElementById('custom-blocks-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((b) => `
      <tr>
        <td><strong>${b.block_title}</strong></td>
        <td>${b.is_active ? '<span class="status-badge approved">Active</span>' : '<span class="status-badge rejected">Inactive</span>'}</td>
        <td>${b.sort_order}</td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick='openEditCustomBlockModal(${JSON.stringify(b)})'><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteCustomBlock(${b.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading custom blocks:', err);
  }
}

function openAddCustomBlockModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Custom HTML Block</h3>
    <form id="add-block-form">
      <div class="form-group">
        <label class="form-label">Block Title *</label>
        <input type="text" id="cb-title" class="form-control" required placeholder="Open Source Highlights">
      </div>
      <div class="form-group">
        <label class="form-label">HTML Content *</label>
        <textarea id="cb-html" class="form-control" rows="6" required placeholder="<div class='custom-spotlight-card'>...</div>"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Active?</label>
          <select id="cb-active" class="form-control">
            <option value="1">Active</option>
            <option value="0">Disabled</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="cb-order" class="form-control" value="0">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save HTML Block</button>
    </form>
  `);

  document.getElementById('add-block-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      block_title: document.getElementById('cb-title').value,
      content_html: document.getElementById('cb-html').value,
      is_active: document.getElementById('cb-active').value === '1',
      sort_order: parseInt(document.getElementById('cb-order').value) || 0
    };
    const res = await fetch('/api/custom-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Custom block added!');
      closeCrudModal();
      loadCustomBlocks();
    }
  });
}

function openEditCustomBlockModal(b) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit HTML Block</h3>
    <form id="edit-block-form">
      <div class="form-group">
        <label class="form-label">Block Title *</label>
        <input type="text" id="ecb-title" class="form-control" value="${b.block_title}" required>
      </div>
      <div class="form-group">
        <label class="form-label">HTML Content *</label>
        <textarea id="ecb-html" class="form-control" rows="6" required>${b.content_html}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Active?</label>
          <select id="ecb-active" class="form-control">
            <option value="1" ${b.is_active ? 'selected' : ''}>Active</option>
            <option value="0" ${!b.is_active ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order</label>
          <input type="number" id="ecb-order" class="form-control" value="${b.sort_order}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-block-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      block_title: document.getElementById('ecb-title').value,
      content_html: document.getElementById('ecb-html').value,
      is_active: document.getElementById('ecb-active').value === '1',
      sort_order: parseInt(document.getElementById('ecb-order').value) || 0
    };
    const res = await fetch(`/api/custom-content/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Custom block updated!');
      closeCrudModal();
      loadCustomBlocks();
    }
  });
}

async function deleteCustomBlock(id) {
  if (!confirm('Delete this custom content block?')) return;
  const res = await fetch(`/api/custom-content/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    showToast('Block deleted');
    loadCustomBlocks();
  }
}

/* ==========================================================================
   CRUD MODAL CONTROLLER & TOASTS
   ========================================================================== */

function openCrudModal(html) {
  const modal = document.getElementById('admin-crud-modal');
  const container = document.getElementById('crud-modal-content');
  if (!modal || !container) return;
  container.innerHTML = html;
  modal.style.display = 'flex';
}

function closeCrudModal() {
  const modal = document.getElementById('admin-crud-modal');
  if (modal) modal.style.display = 'none';
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '2rem';
  toast.style.right = '2rem';
  toast.style.background = '#0d1322';
  toast.style.border = `1px solid ${type === 'error' ? 'var(--admin-danger)' : 'var(--admin-accent)'}`;
  toast.style.color = '#fff';
  toast.style.padding = '0.9rem 1.4rem';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
  toast.style.zIndex = '999999';
  toast.style.fontSize = '0.9rem';
  toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color: ${type === 'error' ? 'var(--admin-danger)' : 'var(--admin-accent)'}; margin-right: 0.6rem;"></i> ${msg}`;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
