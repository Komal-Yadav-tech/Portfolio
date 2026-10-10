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

function escapeAdminHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  if (tabId === 'experience') loadExperience();
  if (tabId === 'themes') loadThemeSetting();
  if (tabId === 'skills') loadSkills();

  // Update header titles
  const titles = {
    overview: ['Dashboard Overview', 'Real-time overview of content and activities'],
    profile: ['Profile & Bio Settings', 'Manage your personal details, avatar image, and resume CV'],
    'about-vision': ['Background & Vision', 'Customize the About section tag, heading, and description paragraphs'],
    'work-process': ['3-Step Creative Workflow', 'Customize the 3-step process cards, numbers, titles, and descriptions'],
    skills: ['Skills & Technologies', 'Manage the infinite dynamic skills marquee displayed on portfolio'],
    experience: ['Work Experience & Roles', 'Manage professional roles, internships, and tech stack tags'],
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
    loadExperience(),
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

    // Background & Vision Section
    const avTag = document.getElementById('av-tag');
    if (avTag) avTag.value = p.about_tag || '[ BACKGROUND & VISION ]';

    const avTitle = document.getElementById('av-title');
    if (avTitle) avTitle.value = p.about_title || 'Transforming Ideas Into <span>Living Digital Art</span>';

    const avDesc1 = document.getElementById('av-desc1');
    if (avDesc1) avDesc1.value = p.about_desc1 !== undefined && p.about_desc1 !== null ? p.about_desc1 : 'With a deep passion at the intersection of graphic design, computer science, and creative engineering, I specialize in architecting interactive web applications that leave a lasting impression.';

    const avDesc2 = document.getElementById('av-desc2');
    if (avDesc2) avDesc2.value = p.about_desc2 !== undefined && p.about_desc2 !== null ? p.about_desc2 : 'Every line of code is written with performance, accessibility, and aesthetic elegance in mind.';

    updateAboutVisionPreview();

    // 3-Step Work Process Section
    const procTag = document.getElementById('proc-tag');
    if (procTag) procTag.value = p.process_tag || '[ HOW I WORK ]';
    const procTitle = document.getElementById('proc-title');
    if (procTitle) procTitle.value = p.process_title || 'The 3-Step <span>Creative Workflow</span>';

    const s1Num = document.getElementById('proc-s1-num');
    if (s1Num) s1Num.value = p.step1_num || '01';
    const s1Title = document.getElementById('proc-s1-title');
    if (s1Title) s1Title.value = p.step1_title || 'DISCOVER & ANALYZE';
    const s1Desc = document.getElementById('proc-s1-desc');
    if (s1Desc) s1Desc.value = p.step1_desc !== undefined && p.step1_desc !== null ? p.step1_desc : 'Deep-dive into objectives, target audience dynamics, technical constraints, and visual moodboards to establish a clear architectural roadmap.';

    const s2Num = document.getElementById('proc-s2-num');
    if (s2Num) s2Num.value = p.step2_num || '02';
    const s2Title = document.getElementById('proc-s2-title');
    if (s2Title) s2Title.value = p.step2_title || 'IDEATE & PROTOTYPE';
    const s2Desc = document.getElementById('proc-s2-desc');
    if (s2Desc) s2Desc.value = p.step2_desc !== undefined && p.step2_desc !== null ? p.step2_desc : 'Iterative interactive prototyping, 3D WebGL asset experimentation, motion choreography, and high-fidelity design systems.';

    const s3Num = document.getElementById('proc-s3-num');
    if (s3Num) s3Num.value = p.step3_num || '03';
    const s3Title = document.getElementById('proc-s3-title');
    if (s3Title) s3Title.value = p.step3_title || 'ENGINEER & DEPLOY';
    const s3Desc = document.getElementById('proc-s3-desc');
    if (s3Desc) s3Desc.value = p.step3_desc !== undefined && p.step3_desc !== null ? p.step3_desc : 'Full-stack implementation with clean modular code, lighthouse speed optimization, cross-device responsiveness, and continuous deployment.';

    updateWorkProcessPreview();

    // Certifications Section Header
    const certTagInput = document.getElementById('cert-sec-tag');
    if (certTagInput) certTagInput.value = p.certs_tag || '[ ACCREDITATIONS & HONORS ]';
    const certTitleInput = document.getElementById('cert-sec-title');
    if (certTitleInput) certTitleInput.value = p.certs_title || 'Verified <span>Certifications & Masteries</span>';
    const certDescInput = document.getElementById('cert-sec-desc');
    if (certDescInput) certDescInput.value = p.certs_desc !== undefined && p.certs_desc !== null ? p.certs_desc : 'Continuous growth through rigorous industry certifications and specialized masterclasses.';

    updateCertsHeaderPreview();
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

  // Certifications Section Header Form
  const certsHeaderForm = document.getElementById('certs-header-form');
  if (certsHeaderForm) {
    certsHeaderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('certs_tag', document.getElementById('cert-sec-tag').value);
      formData.append('certs_title', document.getElementById('cert-sec-title').value);
      formData.append('certs_desc', document.getElementById('cert-sec-desc').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) {
          showToast('Certifications section header updated!');
          loadProfileData();
        } else {
          showToast(result.message || 'Update failed', 'error');
        }
      } catch (err) {
        showToast('Error updating certifications header', 'error');
      }
    });

    ['cert-sec-tag', 'cert-sec-title', 'cert-sec-desc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateCertsHeaderPreview);
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

  // Background & Vision Form
  const aboutVisionForm = document.getElementById('about-vision-form');
  if (aboutVisionForm) {
    aboutVisionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('about_tag', document.getElementById('av-tag').value);
      formData.append('about_title', document.getElementById('av-title').value);
      formData.append('about_desc1', document.getElementById('av-desc1').value);
      formData.append('about_desc2', document.getElementById('av-desc2').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) {
          showToast('Background & Vision updated successfully!');
          loadProfileData();
        } else {
          showToast(result.message || 'Update failed', 'error');
        }
      } catch (err) {
        showToast('Error updating Background & Vision', 'error');
      }
    });

    // Real-time live preview update as user types
    ['av-tag', 'av-title', 'av-desc1', 'av-desc2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateAboutVisionPreview);
    });
  }

  // Work Process (3-Step) Form
  const workProcessForm = document.getElementById('work-process-form');
  if (workProcessForm) {
    workProcessForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('process_tag', document.getElementById('proc-tag').value);
      formData.append('process_title', document.getElementById('proc-title').value);

      formData.append('step1_num', document.getElementById('proc-s1-num').value);
      formData.append('step1_title', document.getElementById('proc-s1-title').value);
      formData.append('step1_desc', document.getElementById('proc-s1-desc').value);

      formData.append('step2_num', document.getElementById('proc-s2-num').value);
      formData.append('step2_title', document.getElementById('proc-s2-title').value);
      formData.append('step2_desc', document.getElementById('proc-s2-desc').value);

      formData.append('step3_num', document.getElementById('proc-s3-num').value);
      formData.append('step3_title', document.getElementById('proc-s3-title').value);
      formData.append('step3_desc', document.getElementById('proc-s3-desc').value);

      try {
        const res = await fetch('/api/profile', { method: 'PUT', body: formData });
        const result = await res.json();
        if (result.success) {
          showToast('3-Step Work Process updated successfully!');
          loadProfileData();
        } else {
          showToast(result.message || 'Update failed', 'error');
        }
      } catch (err) {
        showToast('Error updating Work Process', 'error');
      }
    });

    // Real-time live preview as user types in any input
    const procInputIds = [
      'proc-tag', 'proc-title',
      'proc-s1-num', 'proc-s1-title', 'proc-s1-desc',
      'proc-s2-num', 'proc-s2-title', 'proc-s2-desc',
      'proc-s3-num', 'proc-s3-title', 'proc-s3-desc'
    ];
    procInputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateWorkProcessPreview);
    });
  }
}

function updateAboutVisionPreview() {
  const tagInput = document.getElementById('av-tag');
  const titleInput = document.getElementById('av-title');
  const desc1Input = document.getElementById('av-desc1');
  const desc2Input = document.getElementById('av-desc2');

  const previewTag = document.getElementById('preview-av-tag');
  const previewTitle = document.getElementById('preview-av-title');
  const previewDesc1 = document.getElementById('preview-av-desc1');
  const previewDesc2 = document.getElementById('preview-av-desc2');

  if (previewTag && tagInput) {
    previewTag.textContent = tagInput.value || '[ BACKGROUND & VISION ]';
  }
  if (previewTitle && titleInput) {
    previewTitle.innerHTML = titleInput.value || 'Transforming Ideas Into <span style="color: #00f2fe;">Living Digital Art</span>';
  }
  if (previewDesc1 && desc1Input) {
    previewDesc1.textContent = desc1Input.value;
  }
  if (previewDesc2 && desc2Input) {
    previewDesc2.textContent = desc2Input.value;
    previewDesc2.style.display = (desc2Input.value && desc2Input.value.trim() !== '') ? 'block' : 'none';
  }
}

function updateWorkProcessPreview() {
  const tagInput = document.getElementById('proc-tag');
  const titleInput = document.getElementById('proc-title');

  const s1Num = document.getElementById('proc-s1-num');
  const s1Title = document.getElementById('proc-s1-title');
  const s1Desc = document.getElementById('proc-s1-desc');

  const s2Num = document.getElementById('proc-s2-num');
  const s2Title = document.getElementById('proc-s2-title');
  const s2Desc = document.getElementById('proc-s2-desc');

  const s3Num = document.getElementById('proc-s3-num');
  const s3Title = document.getElementById('proc-s3-title');
  const s3Desc = document.getElementById('proc-s3-desc');

  const prevTag = document.getElementById('preview-proc-tag');
  const prevTitle = document.getElementById('preview-proc-title');

  const prevS1Num = document.getElementById('preview-proc-s1-num');
  const prevS1Title = document.getElementById('preview-proc-s1-title');
  const prevS1Desc = document.getElementById('preview-proc-s1-desc');

  const prevS2Num = document.getElementById('preview-proc-s2-num');
  const prevS2Title = document.getElementById('preview-proc-s2-title');
  const prevS2Desc = document.getElementById('preview-proc-s2-desc');

  const prevS3Num = document.getElementById('preview-proc-s3-num');
  const prevS3Title = document.getElementById('preview-proc-s3-title');
  const prevS3Desc = document.getElementById('preview-proc-s3-desc');

  if (prevTag && tagInput) prevTag.textContent = tagInput.value || '[ HOW I WORK ]';
  if (prevTitle && titleInput) prevTitle.innerHTML = titleInput.value || 'The 3-Step <span style="color: #00f2fe;">Creative Workflow</span>';

  if (prevS1Num && s1Num) prevS1Num.textContent = s1Num.value || '01';
  if (prevS1Title && s1Title) prevS1Title.textContent = s1Title.value || 'DISCOVER & ANALYZE';
  if (prevS1Desc && s1Desc) prevS1Desc.textContent = s1Desc.value || '';

  if (prevS2Num && s2Num) prevS2Num.textContent = s2Num.value || '02';
  if (prevS2Title && s2Title) prevS2Title.textContent = s2Title.value || 'IDEATE & PROTOTYPE';
  if (prevS2Desc && s2Desc) prevS2Desc.textContent = s2Desc.value || '';

  if (prevS3Num && s3Num) prevS3Num.textContent = s3Num.value || '03';
  if (prevS3Title && s3Title) prevS3Title.textContent = s3Title.value || 'ENGINEER & DEPLOY';
  if (prevS3Desc && s3Desc) prevS3Desc.textContent = s3Desc.value || '';
}

function updateCertsHeaderPreview() {
  const tagInput = document.getElementById('cert-sec-tag');
  const titleInput = document.getElementById('cert-sec-title');
  const descInput = document.getElementById('cert-sec-desc');

  const previewTag = document.getElementById('preview-cert-tag');
  const previewTitle = document.getElementById('preview-cert-title');
  const previewDesc = document.getElementById('preview-cert-desc');

  if (previewTag && tagInput) {
    previewTag.textContent = tagInput.value || '[ ACCREDITATIONS & HONORS ]';
  }
  if (previewTitle && titleInput) {
    let formattedTitle = titleInput.value || 'Verified <span>Certifications & Masteries</span>';
    formattedTitle = formattedTitle.replace(/<span>/gi, '<span style="color: #00f2fe;">');
    previewTitle.innerHTML = formattedTitle;
  }
  if (previewDesc && descInput) {
    previewDesc.textContent = descInput.value;
  }
}

/* ==========================================================================
   SKILLS CRUD
   ========================================================================== */

window.skillsData = [];
window.currentSkillFilter = 'all';

async function loadSkills() {
  try {
    const res = await fetch('/api/skills');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.skillsData = list;

    // Update counts
    const countEl = document.getElementById('count-skills');
    if (countEl) countEl.textContent = list.length;
    const allEl = document.getElementById('count-all-skills');
    if (allEl) allEl.textContent = list.length;
    const techEl = document.getElementById('count-tech-skills');
    if (techEl) techEl.textContent = list.filter(s => (s.category || 'technical') === 'technical').length;
    const softEl = document.getElementById('count-soft-skills');
    if (softEl) softEl.textContent = list.filter(s => s.category === 'soft').length;

    renderSkillsTable();
  } catch (err) {
    console.error('Error loading skills:', err);
  }
}

function filterSkillsTable(filter) {
  window.currentSkillFilter = filter;
  ['btn-filter-all', 'btn-filter-tech', 'btn-filter-soft'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  if (filter === 'all') document.getElementById('btn-filter-all')?.classList.add('active');
  if (filter === 'technical') document.getElementById('btn-filter-tech')?.classList.add('active');
  if (filter === 'soft') document.getElementById('btn-filter-soft')?.classList.add('active');

  renderSkillsTable();
}

function renderSkillsTable() {
  const tbody = document.getElementById('skills-table-body');
  if (!tbody) return;

  let list = window.skillsData || [];
  if (window.currentSkillFilter !== 'all') {
    list = list.filter(s => (s.category || 'technical') === window.currentSkillFilter);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-text-sub); padding: 2rem;">No skills found in this category. Click "+ Add Skill" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s) => {
    const isSoft = s.category === 'soft';
    const catBadge = isSoft
      ? `<span class="skill-cat-badge badge-soft"><i class="fas fa-brain"></i> Soft Skill</span>`
      : `<span class="skill-cat-badge badge-tech"><i class="fas fa-code"></i> Technical</span>`;

    const iconStr = (s.icon || '').trim();
    const isFA = iconStr.includes('fa-') || iconStr.startsWith('fa ') || iconStr.startsWith('fab ') || iconStr.startsWith('fas ');
    const iconDisplay = isFA
      ? `<i class="${iconStr}" style="font-size: 1.35rem;"></i>`
      : `<span style="font-size: 1.5rem; line-height: 1;">${iconStr || '⚡'}</span>`;

    return `
      <tr>
        <td style="text-align: center; width: 60px;">${iconDisplay}</td>
        <td><strong style="color: #fff;">${escapeAdminHtml(s.name)}</strong></td>
        <td>${catBadge}</td>
        <td>${s.sort_order}</td>
        <td>
          <div class="table-actions">
            <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick='openEditSkillById(${s.id})' title="Edit Skill"><i class="fas fa-pen"></i></button>
            <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteSkill(${s.id})" title="Delete Skill"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditSkillById(id) {
  const s = (window.skillsData || []).find(item => item.id == id);
  if (!s) return;
  openEditSkillModal(s);
}

window.pickSkillEmoji = function(inputId, previewId, emojiChar) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = emojiChar;
    updateSkillIconPreview(inputId, previewId);
  }
};

window.pickSkillPresetIcon = function(inputId, previewId, iconClass) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = iconClass;
    updateSkillIconPreview(inputId, previewId);
  }
};

window.updateSkillIconPreview = function(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  const val = input.value.trim();
  const isFA = val.includes('fa-') || val.startsWith('fa ') || val.startsWith('fab ') || val.startsWith('fas ');
  if (!val) {
    preview.innerHTML = '<span style="opacity: 0.4;">⚡</span>';
  } else if (isFA) {
    preview.innerHTML = `<i class="${val}"></i>`;
  } else {
    preview.innerHTML = `<span style="font-size: 1.8rem; line-height: 1;">${val}</span>`;
  }
};

function openAddSkillModal() {
  const defaultCategory = window.currentSkillFilter !== 'all' ? window.currentSkillFilter : 'technical';
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
      <i class="fas fa-plus" style="color: var(--admin-accent);"></i> Add Skill / Competency
    </h3>
    <form id="add-skill-form">
      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Skill Category *</label>
          <select id="sk-category" class="form-control" required>
            <option value="technical" ${defaultCategory === 'technical' ? 'selected' : ''}>💻 Technical Skills</option>
            <option value="soft" ${defaultCategory === 'soft' ? 'selected' : ''}>🧠 Soft Skills</option>
          </select>
        </div>
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Skill Name *</label>
          <input type="text" id="sk-name" class="form-control" placeholder="e.g. PYTHON or COMMUNICATION" required>
        </div>
      </div>

      <!-- Live Preview & Main Icon/Emoji Field -->
      <div class="form-group" style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); padding: 1.25rem; border-radius: 10px; margin-bottom: 1.25rem;">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>Skill Emoji or FontAwesome Class *</strong></span>
          <span style="font-size: 0.75rem; color: var(--admin-text-sub);">Click any emoji or preset below</span>
        </label>
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
          <div id="sk-add-preview" class="skill-icon-preview-box">
            <span style="font-size: 1.8rem;">🐍</span>
          </div>
          <div style="flex: 1;">
            <input type="text" id="sk-icon" class="form-control" placeholder="e.g. 🐍 or fab fa-python" value="🐍" oninput="updateSkillIconPreview('sk-icon', 'sk-add-preview')" required>
          </div>
        </div>

        <!-- 1. Dedicated EMOJI PICKER (as requested) -->
        <div style="margin-top: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--admin-accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">
            😀 Quick Emoji Options (Click to add):
          </div>
          <div class="emoji-preset-picker">
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🐍')">🐍 Python</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🤖')">🤖 AI/ML</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '✨')">✨ Vibe Coding</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🐙')">🐙 Git/GitHub</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '📊')">📊 Power BI</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '💻')">💻 HTML/CSS/JS</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🌐')">🌐 Web Dev</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '💬')">💬 Communication</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '👥')">👥 Teamwork</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '👑')">👑 Leadership</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '⏰')">⏰ Time Mgmt</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '⚡')">⚡ Quick Learning</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🚀')">🚀 Full-Stack</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🔥')">🔥 Modern Tech</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🛡️')">🛡️ Cybersecurity</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🧠')">🧠 Problem Solving</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '🎯')">🎯 Focus</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('sk-icon', 'sk-add-preview', '💡')">💡 Innovation</button>
          </div>
        </div>

        <!-- 2. FontAwesome Class Alternative -->
        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.8rem;">
          <div style="font-size: 0.75rem; color: var(--admin-text-sub); margin-bottom: 0.35rem;">
            Or select FontAwesome Brand Icon:
          </div>
          <div class="icon-preset-picker">
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fab fa-python')"><i class="fab fa-python" style="color: #38bdf8;"></i> Python</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-wand-magic-sparkles')"><i class="fas fa-wand-magic-sparkles" style="color: #f59e0b;"></i> AI/Vibe</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fab fa-github')"><i class="fab fa-github" style="color: #fff;"></i> GitHub</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-chart-pie')"><i class="fas fa-chart-pie" style="color: #eab308;"></i> Power BI</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fab fa-code')"><i class="fab fa-code" style="color: #f97316;"></i> HTML/JS</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-comments')"><i class="fas fa-comments" style="color: #06b6d4;"></i> Communication</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-people-group')"><i class="fas fa-people-group" style="color: #10b981;"></i> Teamwork</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-crown')"><i class="fas fa-crown" style="color: #fbbf24;"></i> Leadership</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-clock')"><i class="fas fa-clock" style="color: #38bdf8;"></i> Time Mgmt</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('sk-icon', 'sk-add-preview', 'fas fa-bolt')"><i class="fas fa-bolt" style="color: #facc15;"></i> Learning</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Sort Order</label>
        <input type="number" id="sk-order" class="form-control" value="0">
      </div>

      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem; padding: 0.85rem;">
        <i class="fas fa-check"></i> Add Skill
      </button>
    </form>
  `);

  document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('sk-name').value.trim(),
      category: document.getElementById('sk-category').value,
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
  const currentCat = s.category || 'technical';
  const initialIcon = (s.icon || '⚡').trim();
  const isFA = initialIcon.includes('fa-') || initialIcon.startsWith('fa ') || initialIcon.startsWith('fab ') || initialIcon.startsWith('fas ');
  const previewHtml = isFA ? `<i class="${initialIcon}"></i>` : `<span style="font-size: 1.8rem;">${initialIcon}</span>`;

  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
      <i class="fas fa-pen" style="color: var(--admin-accent);"></i> Edit Skill / Competency
    </h3>
    <form id="edit-skill-form">
      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Skill Category *</label>
          <select id="esk-category" class="form-control" required>
            <option value="technical" ${currentCat === 'technical' ? 'selected' : ''}>💻 Technical Skills</option>
            <option value="soft" ${currentCat === 'soft' ? 'selected' : ''}>🧠 Soft Skills</option>
          </select>
        </div>
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Skill Name *</label>
          <input type="text" id="esk-name" class="form-control" value="${escapeAdminHtml(s.name)}" required>
        </div>
      </div>

      <!-- Live Preview & Main Icon/Emoji Field -->
      <div class="form-group" style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); padding: 1.25rem; border-radius: 10px; margin-bottom: 1.25rem;">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>Skill Emoji or FontAwesome Class *</strong></span>
          <span style="font-size: 0.75rem; color: var(--admin-text-sub);">Click any emoji or preset below</span>
        </label>
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
          <div id="sk-edit-preview" class="skill-icon-preview-box">
            ${previewHtml}
          </div>
          <div style="flex: 1;">
            <input type="text" id="esk-icon" class="form-control" value="${escapeAdminHtml(s.icon || '⚡')}" oninput="updateSkillIconPreview('esk-icon', 'sk-edit-preview')" required>
          </div>
        </div>

        <!-- 1. Dedicated EMOJI PICKER (as requested) -->
        <div style="margin-top: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--admin-accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">
            😀 Quick Emoji Options (Click to choose):
          </div>
          <div class="emoji-preset-picker">
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🐍')">🐍 Python</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🤖')">🤖 AI/ML</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '✨')">✨ Vibe Coding</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🐙')">🐙 Git/GitHub</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '📊')">📊 Power BI</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '💻')">💻 HTML/CSS/JS</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🌐')">🌐 Web Dev</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '💬')">💬 Communication</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '👥')">👥 Teamwork</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '👑')">👑 Leadership</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '⏰')">⏰ Time Mgmt</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '⚡')">⚡ Quick Learning</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🚀')">🚀 Full-Stack</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🔥')">🔥 Modern Tech</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🛡️')">🛡️ Cybersecurity</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🧠')">🧠 Problem Solving</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '🎯')">🎯 Focus</button>
            <button type="button" class="emoji-preset-chip" onclick="pickSkillEmoji('esk-icon', 'sk-edit-preview', '💡')">💡 Innovation</button>
          </div>
        </div>

        <!-- 2. FontAwesome Class Alternative -->
        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.8rem;">
          <div style="font-size: 0.75rem; color: var(--admin-text-sub); margin-bottom: 0.35rem;">
            Or select FontAwesome Brand Icon:
          </div>
          <div class="icon-preset-picker">
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'sk-edit-preview', 'fab fa-python')"><i class="fab fa-python" style="color: #38bdf8;"></i> Python</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'sk-edit-preview', 'fas fa-wand-magic-sparkles')"><i class="fas fa-wand-magic-sparkles" style="color: #f59e0b;"></i> AI/Vibe</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'sk-edit-preview', 'fab fa-github')"><i class="fab fa-github" style="color: #fff;"></i> GitHub</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'sk-edit-preview', 'fas fa-chart-pie')"><i class="fas fa-chart-pie" style="color: #eab308;"></i> Power BI</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'sk-edit-preview', 'fab fa-code')"><i class="fab fa-code" style="color: #f97316;"></i> HTML/JS</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'fas fa-comments')"><i class="fas fa-comments" style="color: #06b6d4;"></i> Communication</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'fas fa-people-group')"><i class="fas fa-people-group" style="color: #10b981;"></i> Teamwork</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'fas fa-crown')"><i class="fas fa-crown" style="color: #fbbf24;"></i> Leadership</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'fas fa-clock')"><i class="fas fa-clock" style="color: #38bdf8;"></i> Time Mgmt</button>
            <button type="button" class="icon-preset-chip" onclick="pickSkillPresetIcon('esk-icon', 'fas fa-bolt')"><i class="fas fa-bolt" style="color: #facc15;"></i> Learning</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Sort Order</label>
        <input type="number" id="esk-order" class="form-control" value="${s.sort_order}">
      </div>

      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem; padding: 0.85rem;">
        <i class="fas fa-check"></i> Save Changes
      </button>
    </form>
  `);

  document.getElementById('edit-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('esk-name').value.trim(),
      category: document.getElementById('esk-category').value,
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

function deleteSkill(id) {
  if (!confirm('Are you sure you want to delete this skill?')) return;
  fetch(`/api/skills/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(result => {
      if (result.success) {
        showToast('Skill deleted');
        loadSkills();
      }
    });
}

/* ==========================================================================
   WORK EXPERIENCE CRUD
   ========================================================================== */

window.experienceData = [];

async function loadExperience() {
  try {
    const res = await fetch('/api/experience');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    // Strict ascending sort by sort_order
    list.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    window.experienceData = list;

    const countEl = document.getElementById('count-experience');
    if (countEl) countEl.textContent = list.length;

    const tbody = document.getElementById('experience-table-body');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-sub); padding: 2rem;">No experience records found. Click "Add Experience" to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((exp) => {
      const badgeRaw = (exp.badge || 'EXPERIENCE').toUpperCase();
      let badgeStyle = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35);';
      if (badgeRaw.includes('MASTER')) badgeStyle = 'background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.35);';
      else if (badgeRaw.includes('LEAD')) badgeStyle = 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.35);';

      const tagsArray = (exp.tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const tagsHtml = tagsArray.map(t => `<span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.06); font-size: 0.75rem; margin: 2px; border: 1px solid rgba(255,255,255,0.1);">${t}</span>`).join('');

      return `
        <tr>
          <td><span style="display:inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 0.72rem; font-weight:700; ${badgeStyle}">${badgeRaw}</span></td>
          <td><strong>${exp.role_title || ''}</strong></td>
          <td><i class="fas fa-building" style="color: var(--admin-accent); margin-right: 4px;"></i> ${exp.company || ''}</td>
          <td><i class="far fa-calendar-alt" style="color: #f97316; margin-right: 4px;"></i> ${exp.duration_location || ''}</td>
          <td style="max-width: 220px;">${tagsHtml || '<span style="color:var(--admin-text-sub);">-</span>'}</td>
          <td><span style="font-weight:700; color: var(--admin-accent);">${exp.sort_order ?? 0}</span></td>
          <td>
            <div class="table-actions">
              <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick="openEditExperienceById(${exp.id})" title="Edit Experience"><i class="fas fa-pen"></i></button>
              <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteExperience(${exp.id})" title="Delete Experience"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading experience:', err);
  }
}

function openEditExperienceById(id) {
  const exp = (window.experienceData || []).find(item => item.id == id);
  if (!exp) return;
  openEditExperienceModal(exp);
}

function openAddExperienceModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Work Experience</h3>
    <form id="add-experience-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Role Title *</label>
          <input type="text" name="role_title" class="form-control" placeholder="e.g. Cybersecurity Analyst Intern" required>
        </div>
        <div class="form-group">
          <label class="form-label">Company / Org *</label>
          <input type="text" name="company" class="form-control" placeholder="e.g. WSCUBE Tech / Tech Training" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Badge Pill Text</label>
          <input type="text" name="badge" class="form-control" placeholder="e.g. MASTER CLASS, LEADERSHIP, HACKATHONS" value="EXPERIENCE">
        </div>
        <div class="form-group">
          <label class="form-label">Duration & Location</label>
          <input type="text" name="duration_location" class="form-control" placeholder="e.g. 2024 • Online or 2023 - Present • Kanpur, UP">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / Achievements</label>
        <textarea name="description" class="form-control" rows="3" placeholder="Summary of responsibilities, achievements, and impact..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tech Stack Tags (Comma-separated)</label>
          <input type="text" name="tags" class="form-control" placeholder="e.g. JavaScript, Node.js, Express, MongoDB, Git">
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order (Ascending: 1, 2, 3...)</label>
          <input type="number" name="sort_order" class="form-control" value="${(window.experienceData?.length || 0) + 1}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Experience</button>
    </form>
  `);

  document.getElementById('add-experience-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      role_title: form.role_title.value,
      company: form.company.value,
      badge: form.badge.value,
      duration_location: form.duration_location.value,
      description: form.description.value,
      tags: form.tags.value,
      sort_order: parseInt(form.sort_order.value) || 0
    };

    try {
      const res = await fetch('/api/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        showToast('Work Experience added successfully!');
        closeCrudModal();
        loadExperience();
      } else {
        showToast(result.message || 'Error adding experience', 'error');
      }
    } catch (err) {
      showToast('Error saving experience', 'error');
    }
  });
}

function openEditExperienceModal(exp) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Work Experience</h3>
    <form id="edit-experience-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Role Title *</label>
          <input type="text" id="edit-exp-role" class="form-control" value="${exp.role_title || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Company / Org *</label>
          <input type="text" id="edit-exp-company" class="form-control" value="${exp.company || ''}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Badge Pill Text</label>
          <input type="text" id="edit-exp-badge" class="form-control" value="${exp.badge || 'EXPERIENCE'}">
        </div>
        <div class="form-group">
          <label class="form-label">Duration & Location</label>
          <input type="text" id="edit-exp-duration" class="form-control" value="${exp.duration_location || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / Achievements</label>
        <textarea id="edit-exp-desc" class="form-control" rows="3">${exp.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tech Stack Tags (Comma-separated)</label>
          <input type="text" id="edit-exp-tags" class="form-control" value="${exp.tags || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Sort Order (Ascending: 1, 2, 3...)</label>
          <input type="number" id="edit-exp-order" class="form-control" value="${exp.sort_order ?? 0}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-experience-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      role_title: document.getElementById('edit-exp-role').value,
      company: document.getElementById('edit-exp-company').value,
      badge: document.getElementById('edit-exp-badge').value,
      duration_location: document.getElementById('edit-exp-duration').value,
      description: document.getElementById('edit-exp-desc').value,
      tags: document.getElementById('edit-exp-tags').value,
      sort_order: parseInt(document.getElementById('edit-exp-order').value) || 0
    };

    try {
      const res = await fetch(`/api/experience/${exp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        showToast('Work Experience updated successfully!');
        closeCrudModal();
        loadExperience();
      } else {
        showToast(result.message || 'Error updating experience', 'error');
      }
    } catch (err) {
      showToast('Error updating experience', 'error');
    }
  });
}

async function deleteExperience(id) {
  if (!confirm('Are you sure you want to delete this work experience entry?')) return;
  try {
    const res = await fetch(`/api/experience/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Work Experience deleted');
      loadExperience();
    } else {
      showToast(result.message || 'Error deleting experience', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting', 'error');
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
   WORK EXPERIENCE CRUD
   ========================================================================== */

window.experienceList = [];

async function loadExperience() {
  try {
    const res = await fetch('/api/experience');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.experienceList = list;

    const countExp = document.getElementById('count-experience');
    if (countExp) countExp.textContent = list.length;

    const tbody = document.getElementById('experience-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-sub); padding: 2rem;">No experience records found. Click "+ Add Experience" to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((e) => {
      const rawBadge = (e.badge || 'EXPERIENCE').toUpperCase();
      let badgeClass = 'badge-master';
      if (rawBadge.includes('LEAD')) badgeClass = 'badge-lead';
      else if (rawBadge.includes('HACK') || rawBadge.includes('TECH')) badgeClass = 'badge-hack';

      return `
        <tr>
          <td><span class="exp-badge-pill ${badgeClass}">${rawBadge}</span></td>
          <td><strong>${e.role_title}</strong></td>
          <td><span style="color: var(--admin-accent); font-weight: 600;">${e.company}</span></td>
          <td>${e.duration_location || ''}</td>
          <td><span style="font-size: 0.82rem; color: var(--admin-text-sub);">${e.tags || ''}</span></td>
          <td>${e.sort_order}</td>
          <td>
            <div class="table-actions">
              <button class="admin-btn admin-btn-outline" style="padding: 0.4rem 0.8rem;" onclick='openEditExperienceById(${e.id})' title="Edit Experience"><i class="fas fa-pen"></i></button>
              <button class="admin-btn admin-btn-danger" style="padding: 0.4rem 0.8rem;" onclick="deleteExperience(${e.id})" title="Delete Experience"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading experience:', err);
  }
}

function openEditExperienceById(id) {
  const e = (window.experienceList || []).find(item => item.id == id);
  if (!e) return;
  openEditExperienceModal(e);
}

function openAddExperienceModal() {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-plus"></i> Add Work Experience</h3>
    <form id="add-exp-form">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Role Title *</label>
          <input type="text" id="exp-role" class="form-control" placeholder="e.g. Cybersecurity Analyst Intern" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Badge Label</label>
          <input type="text" id="exp-badge" class="form-control" placeholder="e.g. MASTER CLASS, LEADERSHIP" value="EXPERIENCE">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Company / Organization *</label>
          <input type="text" id="exp-company" class="form-control" placeholder="e.g. WSCUBE Tech / Tech Training" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Duration & Location</label>
          <input type="text" id="exp-duration" class="form-control" placeholder="e.g. 2024 • online" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / Responsibilities</label>
        <textarea id="exp-desc" class="form-control" rows="3" placeholder="Learn fundaments of Networking and Cyber security..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex: 3;">
          <label class="form-label">Tech Stack / Skills Tags (comma separated)</label>
          <input type="text" id="exp-tags" class="form-control" placeholder="Networking Fundaments, TCP/IP models, Cybersecurity Fundamentals">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Sort Order</label>
          <input type="number" id="exp-order" class="form-control" value="0">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;">Add Experience</button>
    </form>
  `);

  document.getElementById('add-exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      role_title: document.getElementById('exp-role').value.trim(),
      company: document.getElementById('exp-company').value.trim(),
      badge: document.getElementById('exp-badge').value.trim() || 'EXPERIENCE',
      duration_location: document.getElementById('exp-duration').value.trim(),
      description: document.getElementById('exp-desc').value.trim(),
      tags: document.getElementById('exp-tags').value.trim(),
      sort_order: parseInt(document.getElementById('exp-order').value) || 0
    };
    const res = await fetch('/api/experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Experience added successfully!');
      closeCrudModal();
      loadExperience();
    } else {
      showToast(result.message || 'Failed to add experience', 'error');
    }
  });
}

function openEditExperienceModal(exp) {
  openCrudModal(`
    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-pen"></i> Edit Work Experience</h3>
    <form id="edit-exp-form">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Role Title *</label>
          <input type="text" id="eexp-role" class="form-control" value="${exp.role_title}" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Badge Label</label>
          <input type="text" id="eexp-badge" class="form-control" value="${exp.badge || 'EXPERIENCE'}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Company / Organization *</label>
          <input type="text" id="eexp-company" class="form-control" value="${exp.company}" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Duration & Location</label>
          <input type="text" id="eexp-duration" class="form-control" value="${exp.duration_location || ''}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / Responsibilities</label>
        <textarea id="eexp-desc" class="form-control" rows="3">${exp.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex: 3;">
          <label class="form-label">Tech Stack / Skills Tags (comma separated)</label>
          <input type="text" id="eexp-tags" class="form-control" value="${exp.tags || ''}">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Sort Order</label>
          <input type="number" id="eexp-order" class="form-control" value="${exp.sort_order}">
        </div>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;">Save Changes</button>
    </form>
  `);

  document.getElementById('edit-exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      role_title: document.getElementById('eexp-role').value.trim(),
      company: document.getElementById('eexp-company').value.trim(),
      badge: document.getElementById('eexp-badge').value.trim() || 'EXPERIENCE',
      duration_location: document.getElementById('eexp-duration').value.trim(),
      description: document.getElementById('eexp-desc').value.trim(),
      tags: document.getElementById('eexp-tags').value.trim(),
      sort_order: parseInt(document.getElementById('eexp-order').value) || 0
    };
    const res = await fetch(`/api/experience/${exp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Experience updated successfully!');
      closeCrudModal();
      loadExperience();
    } else {
      showToast(result.message || 'Failed to update experience', 'error');
    }
  });
}

function deleteExperience(id) {
  if (!confirm('Are you sure you want to delete this experience record?')) return;
  fetch(`/api/experience/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(result => {
      if (result.success) {
        showToast('Experience record deleted');
        loadExperience();
      }
    });
}

/* ==========================================================================
   EDUCATION CRUD
   ========================================================================== */

function escapeAdminHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.educationData = [];

async function loadEducation() {
  try {
    const res = await fetch('/api/education');
    const result = await res.json();
    if (!result.success) return;
    const list = result.data || [];
    window.educationData = list;

    const countEdu = document.getElementById('count-education');
    if (countEdu) countEdu.textContent = list.length;

    const tbody = document.getElementById('education-table-body');
    const emptyState = document.getElementById('education-empty-state');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = list.map((e, idx) => {
      const year = e.year || e.pass_year || '';
      const title = e.title || e.degree || '';
      const institute = e.institute || e.institution || '';
      const percentage = e.percentage || '';
      const isOngoing = Boolean(e.isOngoing || e.is_ongoing || /ongoing/i.test(year));
      const sortOrder = e.sortOrder ?? e.sort_order ?? (idx + 1);

      const statusBadge = isOngoing
        ? `<span class="status-badge approved" style="display:inline-flex; align-items:center; gap:0.4rem;"><i class="fas fa-circle-dot" style="font-size:0.6rem; color:#22c55e;"></i> Ongoing</span>`
        : `<span class="status-badge" style="background:rgba(255,255,255,0.06); color:var(--admin-text-sub);">Completed</span>`;

      const percentageDisplay = percentage
        ? `<span class="status-badge" style="background:rgba(34, 197, 94, 0.12); color:#22c55e; border:1px solid rgba(34, 197, 94, 0.3); font-weight:700;">${escapeAdminHtml(percentage)}</span>`
        : (isOngoing ? `<span style="font-size:0.8rem; color:var(--admin-text-sub); font-style:italic;">In Progress</span>` : `<span style="color:var(--admin-text-muted);">—</span>`);

      return `
        <tr>
          <td><span class="status-badge approved" style="font-family:monospace;">${escapeAdminHtml(year)}</span></td>
          <td><strong style="color:#fff;">${escapeAdminHtml(title)}</strong></td>
          <td><i class="fas fa-building" style="color:var(--admin-accent); font-size:0.8rem; margin-right:0.35rem; opacity:0.8;"></i>${escapeAdminHtml(institute)}</td>
          <td>${percentageDisplay}</td>
          <td>${statusBadge}</td>
          <td><span class="nav-badge-pill" style="display:inline-block; font-family:monospace;">${sortOrder}</span></td>
          <td>
            <div class="table-actions">
              <button class="admin-btn admin-btn-outline" title="Edit Qualification" style="padding: 0.4rem 0.8rem;" onclick="openEditEducationModalById(${e.id})">
                <i class="fas fa-pen"></i>
              </button>
              <button class="admin-btn admin-btn-danger" title="Delete Qualification" style="padding: 0.4rem 0.8rem;" onclick="deleteEducation(${e.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading education:', err);
  }
}

window.openEditEducationModalById = function(id) {
  const edu = (window.educationData || []).find(x => x.id === id);
  if (edu) openEditEducationModal(edu);
};

function openAddEducationModal() {
  const currentTotal = (window.educationData || []).length;
  const nextOrder = currentTotal + 1;

  openCrudModal(`
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--admin-border); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; display: flex; align-items: center; gap: 0.6rem;">
        <i class="fas fa-graduation-cap" style="color: var(--admin-accent);"></i> Add Academic Qualification
      </h3>
    </div>
    <form id="add-edu-form">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label" for="edu-degree">Degree / Class Title *</label>
          <input type="text" id="edu-degree" class="form-control" required placeholder="e.g. Bachelor of Computer Applications">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="edu-year">Year / Duration *</label>
          <input type="text" id="edu-year" class="form-control" required placeholder="e.g. 2024 - 2027">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="edu-inst">Institute / University / Board *</label>
        <input type="text" id="edu-inst" class="form-control" required placeholder="e.g. CSJM University, Kanpur or CBSE Board">
      </div>

      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="edu-percentage">Percentage (Optional)</label>
          <input type="text" id="edu-percentage" class="form-control" placeholder="e.g. 76% or 81">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="edu-order">Sort Order</label>
          <input type="number" id="edu-order" class="form-control" value="${nextOrder}" min="1">
        </div>
      </div>

      <div class="form-group" style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); padding: 0.9rem 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; margin: 0;">
          <input type="checkbox" id="edu-ongoing" style="width: 18px; height: 18px; accent-color: var(--admin-accent); cursor: pointer;">
          <div>
            <strong style="color: #fff; font-size: 0.9rem;">Currently Pursuing (Ongoing)</strong>
            <p style="margin: 0; font-size: 0.78rem; color: var(--admin-text-sub);">Displays glowing pulse beacon on the portfolio</p>
          </div>
        </label>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button type="button" class="admin-btn admin-btn-outline" onclick="closeCrudModal()">Cancel</button>
        <button type="submit" id="add-edu-submit-btn" class="admin-btn admin-btn-primary">
          <i class="fas fa-check"></i> Save Qualification
        </button>
      </div>
    </form>
  `);

  document.getElementById('add-edu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-edu-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    const title = document.getElementById('edu-degree').value.trim();
    const institute = document.getElementById('edu-inst').value.trim();
    const year = document.getElementById('edu-year').value.trim();
    const percentage = document.getElementById('edu-percentage').value.trim();
    const isOngoing = document.getElementById('edu-ongoing').checked;
    const sortOrder = parseInt(document.getElementById('edu-order').value) || nextOrder;

    try {
      const res = await fetch('/api/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          institute,
          year,
          percentage,
          isOngoing,
          sortOrder
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast('Academic qualification added successfully!');
        closeCrudModal();
        loadEducation();
      } else {
        showToast(result.message || 'Failed to add qualification', 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-check"></i> Save Qualification';
        }
      }
    } catch (err) {
      showToast('Network or server error', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Save Qualification';
      }
    }
  });
}

function openEditEducationModal(edu) {
  const isOngoing = Boolean(edu.isOngoing || edu.is_ongoing || /ongoing/i.test(edu.pass_year || edu.year));
  const year = edu.year || edu.pass_year || '';
  const title = edu.title || edu.degree || '';
  const institute = edu.institute || edu.institution || '';
  const percentage = edu.percentage || (edu.grade_or_details && !/progress/i.test(edu.grade_or_details) ? edu.grade_or_details : '');
  const sortOrder = edu.sortOrder ?? edu.sort_order ?? 0;

  openCrudModal(`
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--admin-border); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; display: flex; align-items: center; gap: 0.6rem;">
        <i class="fas fa-pen" style="color: var(--admin-accent);"></i> Edit Academic Qualification
      </h3>
    </div>
    <form id="edit-edu-form">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label" for="e-edu-degree">Degree / Class Title *</label>
          <input type="text" id="e-edu-degree" class="form-control" value="${escapeAdminHtml(title)}" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="e-edu-year">Year / Duration *</label>
          <input type="text" id="e-edu-year" class="form-control" value="${escapeAdminHtml(year)}" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="e-edu-inst">Institute / University / Board *</label>
        <input type="text" id="e-edu-inst" class="form-control" value="${escapeAdminHtml(institute)}" required>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="e-edu-percentage">Percentage (Optional)</label>
          <input type="text" id="e-edu-percentage" class="form-control" value="${escapeAdminHtml(percentage)}" placeholder="e.g. 76%">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label" for="e-edu-order">Sort Order</label>
          <input type="number" id="e-edu-order" class="form-control" value="${sortOrder}" min="1">
        </div>
      </div>

      <div class="form-group" style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); padding: 0.9rem 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; margin: 0;">
          <input type="checkbox" id="e-edu-ongoing" ${isOngoing ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--admin-accent); cursor: pointer;">
          <div>
            <strong style="color: #fff; font-size: 0.9rem;">Currently Pursuing (Ongoing)</strong>
            <p style="margin: 0; font-size: 0.78rem; color: var(--admin-text-sub);">Displays glowing pulse beacon on the portfolio</p>
          </div>
        </label>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button type="button" class="admin-btn admin-btn-outline" onclick="closeCrudModal()">Cancel</button>
        <button type="submit" id="edit-edu-submit-btn" class="admin-btn admin-btn-primary">
          <i class="fas fa-check"></i> Save Changes
        </button>
      </div>
    </form>
  `);

  document.getElementById('edit-edu-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('edit-edu-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    const titleVal = document.getElementById('e-edu-degree').value.trim();
    const instVal = document.getElementById('e-edu-inst').value.trim();
    const yearVal = document.getElementById('e-edu-year').value.trim();
    const percVal = document.getElementById('e-edu-percentage').value.trim();
    const ongoingVal = document.getElementById('e-edu-ongoing').checked;
    const orderVal = parseInt(document.getElementById('e-edu-order').value) || sortOrder;

    try {
      const res = await fetch(`/api/education/${edu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleVal,
          institute: instVal,
          year: yearVal,
          percentage: percVal,
          isOngoing: ongoingVal,
          sortOrder: orderVal
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast('Academic qualification updated successfully!');
        closeCrudModal();
        loadEducation();
      } else {
        showToast(result.message || 'Failed to update qualification', 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
        }
      }
    } catch (err) {
      showToast('Network or server error', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
      }
    }
  });
}

async function deleteEducation(id) {
  if (!confirm('Kya aap sach me delete karna chahte ho?')) return;
  try {
    const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Academic qualification deleted successfully!');
      loadEducation();
    } else {
      showToast(result.message || 'Failed to delete qualification', 'error');
    }
  } catch (err) {
    showToast('Failed to delete qualification', 'error');
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
   12 LUXURY THEMES & DISPLAY MODE CONTROLLER
   ========================================================================== */

window.currentActiveTheme = 'midnight-blue';
window.currentActiveMode = 'dark';

function updateThemeAndModeUI() {
  // Update Mode Badge in Themes Tab
  const modeBadge = document.getElementById('active-mode-badge');
  if (modeBadge) {
    const isLight = window.currentActiveMode === 'light';
    modeBadge.className = 'status-badge ' + (isLight ? 'featured' : 'approved');
    modeBadge.innerHTML = isLight 
      ? '<i class="fas fa-sun"></i> Light Mode Active'
      : '<i class="fas fa-moon"></i> Dark Mode Active';
  }

  // Update Dark/Light buttons
  const btnDark = document.getElementById('btn-mode-dark');
  const btnLight = document.getElementById('btn-mode-light');
  if (btnDark && btnLight) {
    if (window.currentActiveMode === 'light') {
      btnLight.className = 'admin-btn admin-btn-primary';
      btnDark.className = 'admin-btn admin-btn-outline';
    } else {
      btnDark.className = 'admin-btn admin-btn-primary';
      btnLight.className = 'admin-btn admin-btn-outline';
    }
  }

  // Update Header Button
  const headerModeIcon = document.getElementById('header-mode-icon');
  const headerModeText = document.getElementById('header-mode-text');
  if (headerModeIcon && headerModeText) {
    const isLight = window.currentActiveMode === 'light';
    headerModeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    headerModeText.textContent = isLight ? 'Light Mode' : 'Dark Mode';
  }

  // Update Theme Badge in Themes Tab
  const themeBadgeName = document.getElementById('active-theme-name');
  if (themeBadgeName) {
    const foundTheme = THEMES_CONFIG.find(t => t.id === window.currentActiveTheme);
    themeBadgeName.textContent = foundTheme ? foundTheme.name : window.currentActiveTheme;
  }
}

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
      ${t.id === activeId ? '<span style="position: absolute; top: 8px; right: 8px; color: var(--admin-accent); font-weight: 700; font-size: 0.75rem;"><i class="fas fa-circle-check"></i> Active</span>' : ''}
    </div>
  `).join('');
}

async function loadThemeSetting() {
  try {
    const res = await fetch('/api/theme');
    const result = await res.json();
    if (result.success && result.data) {
      window.currentActiveTheme = result.data.active_theme || 'midnight-blue';
      window.currentActiveMode = result.data.mode || 'dark';
      document.documentElement.setAttribute('data-theme', window.currentActiveTheme);
      document.documentElement.setAttribute('data-mode', window.currentActiveMode);
      renderThemesGrid(window.currentActiveTheme);
      updateThemeAndModeUI();
    }
  } catch (err) {
    console.error('Error loading theme:', err);
  }
}

async function selectTheme(themeId) {
  try {
    window.currentActiveTheme = themeId;
    const res = await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_theme: themeId, mode: window.currentActiveMode || 'dark' })
    });
    const result = await res.json();
    if (result.success) {
      document.documentElement.setAttribute('data-theme', themeId);
      localStorage.setItem('komal_portfolio_theme', themeId);
      localStorage.setItem('komal_portfolio_theme_override', 'true');
      showToast(`Global theme updated to ${themeId.replace(/-/g, ' ').toUpperCase()}!`);
      renderThemesGrid(themeId);
      updateThemeAndModeUI();
    }
  } catch (err) {
    showToast('Failed to update theme', 'error');
  }
}

window.setAdminMode = async function(mode) {
  window.currentActiveMode = mode;
  try {
    const res = await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_theme: window.currentActiveTheme, mode })
    });
    const result = await res.json();
    if (result.success) {
      document.documentElement.setAttribute('data-mode', mode);
      localStorage.setItem('komal_portfolio_mode', mode);
      updateThemeAndModeUI();
      showToast(`Website switched to ${mode.toUpperCase()} mode!`);
    }
  } catch (err) {
    showToast('Failed to switch mode', 'error');
  }
};

window.toggleAdminMode = function() {
  const nextMode = window.currentActiveMode === 'dark' ? 'light' : 'dark';
  window.setAdminMode(nextMode);
};

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
