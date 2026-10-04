/**
 * Frontend Data Hydration & Dynamic Interaction Logic
 */

// 1. Instant Theme & Mode Initialization (Prevents FOUC)
(function initThemeEarly() {
  const savedTheme = localStorage.getItem('komal_portfolio_theme') || 'midnight-blue';
  const savedMode = localStorage.getItem('komal_portfolio_mode') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-mode', savedMode);
})();

document.addEventListener('DOMContentLoaded', async () => {
  // Setup Theme Toggle Button
  const themeToggleBtn = document.getElementById('theme-mode-toggle');
  if (themeToggleBtn) {
    updateThemeToggleIcon();
    themeToggleBtn.addEventListener('click', toggleLightDarkMode);
  }

  // Load all dynamic data from server
  await fetchAndHydrateAll();

  // Setup Modals
  initReviewModal();
  initCertModal();
});

/* ==========================================================================
   THEME & MODE CONTROLLER
   ========================================================================== */

function toggleLightDarkMode() {
  const currentMode = document.documentElement.getAttribute('data-mode') || 'dark';
  const nextMode = currentMode === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-mode', nextMode);
  localStorage.setItem('komal_portfolio_mode', nextMode);
  updateThemeToggleIcon();
  showToast(`Switched to ${nextMode.toUpperCase()} mode`);
}

function updateThemeToggleIcon() {
  const btn = document.getElementById('theme-mode-toggle');
  if (!btn) return;
  const currentMode = document.documentElement.getAttribute('data-mode');
  btn.innerHTML = currentMode === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

/* ==========================================================================
   DATA HYDRATION FROM REST API
   ========================================================================== */

async function fetchAndHydrateAll() {
  try {
    const [profileRes, skillsRes, expRes, projectsRes, eduRes, certsRes, reviewsRes, themeRes, customRes] = await Promise.allSettled([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
      fetch('/api/experience').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/education').then(r => r.json()),
      fetch('/api/certifications').then(r => r.json()),
      fetch('/api/reviews').then(r => r.json()),
      fetch('/api/theme').then(r => r.json()),
      fetch('/api/custom-content').then(r => r.json())
    ]);

    if (themeRes.status === 'fulfilled' && themeRes.value.success && themeRes.value.data) {
      const { active_theme } = themeRes.value.data;
      if (active_theme) {
        document.documentElement.setAttribute('data-theme', active_theme);
        localStorage.setItem('komal_portfolio_theme', active_theme);
      }
    }

    if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) {
      hydrateProfile(profileRes.value.data);
    }

    if (skillsRes.status === 'fulfilled' && skillsRes.value.success && skillsRes.value.data) {
      hydrateSkills(skillsRes.value.data);
    }

    if (expRes.status === 'fulfilled' && expRes.value.success && expRes.value.data) {
      hydrateExperience(expRes.value.data);
    }

    if (projectsRes.status === 'fulfilled' && projectsRes.value.success && projectsRes.value.data) {
      hydrateProjects(projectsRes.value.data);
    }

    if (eduRes.status === 'fulfilled' && eduRes.value.success && eduRes.value.data) {
      hydrateEducation(eduRes.value.data);
    }

    if (certsRes.status === 'fulfilled' && certsRes.value.success && certsRes.value.data) {
      hydrateCertifications(certsRes.value.data);
    }

    if (reviewsRes.status === 'fulfilled' && reviewsRes.value.success && reviewsRes.value.data) {
      hydrateReviews(reviewsRes.value.data);
    }

    if (customRes.status === 'fulfilled' && customRes.value.success && customRes.value.data) {
      hydrateCustomBlocks(customRes.value.data);
    }

    // Refresh cursor hover listeners and magnetic effects
    if (window.attachCursorHoverStates) window.attachCursorHoverStates();
    if (window.applyMagneticEffect) window.applyMagneticEffect();
  } catch (error) {
    console.warn('API hydration fallback active:', error);
  }
}

function hydrateProfile(p) {
  // Brand / Splash
  const brandName = document.querySelectorAll('.brand-name-text');
  brandName.forEach(el => el.textContent = p.full_name ? p.full_name.split(' ')[0].toUpperCase() : 'KOMAL');

  // Hero
  const heroGreeting = document.getElementById('hero-greeting');
  if (heroGreeting) heroGreeting.textContent = p.greeting || "Hello, I'm";

  const heroName = document.getElementById('hero-name');
  if (heroName) heroName.textContent = (p.full_name || 'KOMAL YADAV').toUpperCase();

  // Dynamic Browser Tab Title
  if (p.full_name) {
    document.title = `${p.full_name} — ${p.title || 'Creative Technologist & Full-Stack Architect'}`;
  }

  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) heroTitle.textContent = p.title || 'Creative Technologist & Full-Stack Architect';

  const heroBio = document.getElementById('hero-bio');
  if (heroBio) heroBio.textContent = p.bio || '';

  const availPill = document.getElementById('hero-availability-pill');
  if (availPill) {
    availPill.innerHTML = `<span class="pulse-dot"></span> ${p.availability_status || 'AVAILABLE FOR WORK'}`;
  }

  const avatarImg = document.getElementById('hero-avatar-img');
  if (avatarImg && p.profile_image) {
    avatarImg.src = p.profile_image;
  }

  const resumeBtn = document.getElementById('hero-resume-btn');
  if (resumeBtn && p.resume_url) {
    resumeBtn.href = p.resume_url;
    resumeBtn.setAttribute('download', '');
  }

  // Floating Stats (Certifications, Projects, Skills)
  const statCerts = document.getElementById('stat-certs') || document.getElementById('stat-exp');
  if (statCerts) statCerts.textContent = p.stats_experience || '5+';
  const statProj = document.getElementById('stat-proj');
  if (statProj) statProj.textContent = p.stats_projects || '1+';
  const statSkills = document.getElementById('stat-skills') || document.getElementById('stat-clients');
  if (statSkills) statSkills.textContent = p.stats_clients || '5+';

  // Quote Box
  const quoteText = document.getElementById('quote-text');
  if (quoteText) quoteText.textContent = `"${p.quote_text || 'Design is how it works.'}"`;
  const quoteAuthor = document.getElementById('quote-author');
  if (quoteAuthor) quoteAuthor.textContent = p.quote_author || 'Steve Jobs';
  const quoteRole = document.getElementById('quote-role');
  if (quoteRole) {
    if (p.quote_role && p.quote_role.trim()) {
      quoteRole.textContent = p.quote_role.trim();
      quoteRole.style.display = '';
    } else {
      quoteRole.textContent = '';
      quoteRole.style.display = 'none';
    }
  }

  // Footer & Contact
  const userEmail = p.email || 'komalyadav642006@gmail.com';
  const footerEmail = document.getElementById('footer-email');
  const footerEmailLink = document.getElementById('footer-email-link');
  if (footerEmail) footerEmail.textContent = userEmail;
  if (footerEmailLink) {
    footerEmailLink.href = `mailto:${userEmail}?subject=Portfolio%20Inquiry`;
  }

  // "Start A Conversation" CTA button - direct link to send email to user
  const footerCtaBtn = document.getElementById('footer-cta-btn');
  if (footerCtaBtn) {
    const mailtoSubject = encodeURIComponent("Let's Collaborate - Project Inquiry");
    const mailtoBody = encodeURIComponent("Hi Komal,\n\nI visited your portfolio and would like to connect with you regarding a project.\n\nBest regards,");
    const mailtoUrl = `mailto:${userEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;
    footerCtaBtn.href = mailtoUrl;
    footerCtaBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = mailtoUrl;
    };
  }

  const userPhone = p.phone || '+91 8303755587';
  const footerPhone = document.getElementById('footer-phone');
  const footerPhoneLink = document.getElementById('footer-phone-link');
  if (footerPhone) footerPhone.textContent = userPhone;
  if (footerPhoneLink) {
    footerPhoneLink.href = `tel:${userPhone.replace(/\s+/g, '')}`;
  }

  const footerLocation = document.getElementById('footer-location');
  if (footerLocation) footerLocation.textContent = p.location || 'Kanpur, uttar pradesh';

  const footerLinkedIn = document.getElementById('footer-linkedin');
  if (footerLinkedIn && p.linkedin) footerLinkedIn.href = p.linkedin;

  const footerGithub = document.getElementById('footer-github');
  if (footerGithub && p.github) footerGithub.href = p.github;

  // Dynamic Footer Box
  const footerBoxTitle = document.getElementById('footer-box-title');
  if (footerBoxTitle) footerBoxTitle.textContent = p.footer_title || "Let's collaborate";
  const footerBoxContent = document.getElementById('footer-box-content');
  if (footerBoxContent) footerBoxContent.innerHTML = p.footer_content || '';

  // Dynamic Skills Section Header
  const skillsTag = document.getElementById('skills-tag');
  if (skillsTag && p.skills_tag) skillsTag.textContent = p.skills_tag;

  const skillsTitle = document.getElementById('skills-title');
  if (skillsTitle && p.skills_title) {
    skillsTitle.innerHTML = p.skills_title;
  }

  const skillsDesc = document.getElementById('skills-desc');
  if (skillsDesc && p.skills_desc) skillsDesc.textContent = p.skills_desc;

  // Dynamic Background & Vision (About Section)
  const aboutTag = document.getElementById('about-tag');
  if (aboutTag && p.about_tag) aboutTag.textContent = p.about_tag;

  const aboutTitle = document.getElementById('about-title');
  if (aboutTitle && p.about_title) {
    aboutTitle.innerHTML = p.about_title;
  }

  const aboutDesc1 = document.getElementById('about-desc1');
  if (aboutDesc1 && p.about_desc1 !== undefined && p.about_desc1 !== null) {
    aboutDesc1.textContent = p.about_desc1;
  }

  const aboutDesc2 = document.getElementById('about-desc2');
  if (aboutDesc2 && p.about_desc2 !== undefined && p.about_desc2 !== null) {
    aboutDesc2.textContent = p.about_desc2;
    aboutDesc2.style.display = (p.about_desc2 && p.about_desc2.trim() !== '') ? 'block' : 'none';
  }

  // Dynamic 3-Step Work Process
  const processTag = document.getElementById('process-tag');
  if (processTag && p.process_tag) processTag.textContent = p.process_tag;

  const processTitle = document.getElementById('process-title');
  if (processTitle && p.process_title) {
    processTitle.innerHTML = p.process_title;
  }

  const s1Num = document.getElementById('step1-num');
  if (s1Num && p.step1_num) s1Num.textContent = p.step1_num;
  const s1Title = document.getElementById('step1-title');
  if (s1Title && p.step1_title) s1Title.textContent = p.step1_title;
  const s1Desc = document.getElementById('step1-desc');
  if (s1Desc && p.step1_desc) s1Desc.textContent = p.step1_desc;

  const s2Num = document.getElementById('step2-num');
  if (s2Num && p.step2_num) s2Num.textContent = p.step2_num;
  const s2Title = document.getElementById('step2-title');
  if (s2Title && p.step2_title) s2Title.textContent = p.step2_title;
  const s2Desc = document.getElementById('step2-desc');
  if (s2Desc && p.step2_desc) s2Desc.textContent = p.step2_desc;

  const s3Num = document.getElementById('step3-num');
  if (s3Num && p.step3_num) s3Num.textContent = p.step3_num;
  const s3Title = document.getElementById('step3-title');
  if (s3Title && p.step3_title) s3Title.textContent = p.step3_title;
  const s3Desc = document.getElementById('step3-desc');
  if (s3Desc && p.step3_desc) s3Desc.textContent = p.step3_desc;

  // Dynamic Certifications Section Header
  const certsTag = document.getElementById('certs-tag');
  if (certsTag && p.certs_tag) certsTag.textContent = p.certs_tag;

  const certsTitle = document.getElementById('certs-title');
  if (certsTitle && p.certs_title) {
    certsTitle.innerHTML = p.certs_title;
  }

  const certsDesc = document.getElementById('certs-desc');
  if (certsDesc && p.certs_desc !== undefined && p.certs_desc !== null) {
    certsDesc.textContent = p.certs_desc;
  }
}

window.switchSkillsTab = function(tab) {
  const pills = document.querySelectorAll('.skills-tab-pill');
  pills.forEach(p => p.classList.remove('active'));

  const activeBtn = document.getElementById(`tab-${tab}-skills`) || document.querySelector(`[data-skill-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const techBlock = document.getElementById('tech-skills-block');
  const softBlock = document.getElementById('soft-skills-block');
  const dualContainer = document.getElementById('skills-dual-container');

  if (tab === 'all') {
    if (techBlock) techBlock.style.display = '';
    if (softBlock) softBlock.style.display = '';
    if (dualContainer && window.innerWidth > 992) dualContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
  } else if (tab === 'technical') {
    if (techBlock) techBlock.style.display = '';
    if (softBlock) softBlock.style.display = 'none';
    if (dualContainer) dualContainer.style.gridTemplateColumns = '1fr';
  } else if (tab === 'soft') {
    if (techBlock) techBlock.style.display = 'none';
    if (softBlock) softBlock.style.display = '';
    if (dualContainer) dualContainer.style.gridTemplateColumns = '1fr';
  }
};

function hydrateSkills(skills) {
  if (!skills || !skills.length) return;

  const techSkills = skills.filter(s => (s.category || 'technical') === 'technical');
  const softSkills = skills.filter(s => s.category === 'soft');

  // Update counts
  const techBadge = document.getElementById('tech-skills-badge');
  if (techBadge) techBadge.textContent = `${techSkills.length} Skills`;

  const softBadge = document.getElementById('soft-skills-badge');
  if (softBadge) softBadge.textContent = `${softSkills.length} Skills`;

  // Hydrate Technical Skills Grid
  const techGrid = document.getElementById('tech-skills-grid');
  if (techGrid) {
    techGrid.innerHTML = techSkills.map(s => `
      <div class="skill-chip-item glass-sheen">
        <div class="skill-chip-icon"><i class="${s.icon || 'fas fa-cube'}"></i></div>
        <div class="skill-chip-info">
          <span class="skill-chip-name">${s.name}</span>
          <span class="skill-chip-sub">Technical Tool</span>
        </div>
      </div>
    `).join('');
  }

  // Hydrate Soft Skills Grid
  const softGrid = document.getElementById('soft-skills-grid');
  if (softGrid) {
    softGrid.innerHTML = softSkills.map(s => `
      <div class="skill-chip-item glass-sheen">
        <div class="skill-chip-icon"><i class="${s.icon || 'fas fa-brain'}"></i></div>
        <div class="skill-chip-info">
          <span class="skill-chip-name">${s.name}</span>
          <span class="skill-chip-sub">Core Competency</span>
        </div>
      </div>
    `).join('');
  }

  // Ambient Infinite Marquee Track (all skills)
  const marqueeContainer = document.getElementById('skills-marquee-track');
  if (marqueeContainer) {
    const itemsHtml = skills.map(s => `
      <div class="marquee-item"><i class="${s.icon || 'fas fa-cube'}"></i> ${s.name}</div>
    `).join('');
    marqueeContainer.innerHTML = itemsHtml + itemsHtml;
  }
}

/* ==========================================================================
   WORK EXPERIENCE CAROUSEL / SLIDER
   ========================================================================== */

window.experienceData = [];
window.currentExpSlide = 0;

window.navigateExperience = function(dir) {
  const list = window.experienceData || [];
  if (!list.length) return;

  const isMobile = window.innerWidth <= 860;
  const cardsPerView = isMobile ? 1 : 2;
  const maxSlide = Math.max(0, list.length - cardsPerView);

  window.currentExpSlide = Math.min(Math.max(window.currentExpSlide + dir, 0), maxSlide);
  updateExperienceSlider();
};

window.goToExperienceSlide = function(idx) {
  const list = window.experienceData || [];
  if (!list.length) return;

  const isMobile = window.innerWidth <= 860;
  const cardsPerView = isMobile ? 1 : 2;
  const maxSlide = Math.max(0, list.length - cardsPerView);

  window.currentExpSlide = Math.min(Math.max(idx, 0), maxSlide);
  updateExperienceSlider();
};

function updateExperienceSlider() {
  const track = document.getElementById('experience-cards-track');
  const cards = track ? track.querySelectorAll('.experience-card') : [];
  if (!track || !cards.length) return;

  const isMobile = window.innerWidth <= 860;
  const cardsPerView = isMobile ? 1 : 2;
  const maxSlide = Math.max(0, cards.length - cardsPerView);

  if (window.currentExpSlide > maxSlide) {
    window.currentExpSlide = maxSlide;
  }

  const card = cards[0];
  const cardRect = card.getBoundingClientRect();
  const gap = 32; // 2rem
  const slideDistance = (cardRect.width + gap) * window.currentExpSlide;

  track.style.transform = `translateX(-${slideDistance}px)`;

  // Update numbers
  const currEl = document.getElementById('exp-curr-idx');
  if (currEl) {
    const displayNum = Math.min(window.currentExpSlide + 1, cards.length);
    currEl.textContent = displayNum < 10 ? `0${displayNum}` : displayNum;
  }

  // Update dots
  const dots = document.querySelectorAll('.exp-dot');
  dots.forEach((d, idx) => {
    if (idx === window.currentExpSlide) {
      d.classList.add('active');
    } else {
      d.classList.remove('active');
    }
  });

  // Update button opacities
  const prevBtn = document.getElementById('exp-prev-btn');
  const nextBtn = document.getElementById('exp-next-btn');
  if (prevBtn) prevBtn.style.opacity = window.currentExpSlide === 0 ? '0.4' : '1';
  if (nextBtn) nextBtn.style.opacity = window.currentExpSlide >= maxSlide ? '0.4' : '1';
}

function hydrateExperience(experiences) {
  const track = document.getElementById('experience-cards-track');
  if (!track || !experiences || !experiences.length) return;

  window.experienceData = experiences;
  window.currentExpSlide = 0;

  // Counter total
  const totalEl = document.getElementById('exp-total-idx');
  if (totalEl) {
    const totalCount = experiences.length;
    totalEl.textContent = totalCount < 10 ? `0${totalCount}` : totalCount;
  }

  track.innerHTML = experiences.map((exp, idx) => {
    const badgeText = (exp.badge || 'EXPERIENCE').toUpperCase();
    let badgeClass = 'badge-default';
    if (badgeText.includes('MASTER') || badgeText.includes('CLASS')) badgeClass = 'badge-masterclass';
    else if (badgeText.includes('LEAD')) badgeClass = 'badge-leadership';
    else if (badgeText.includes('HACK')) badgeClass = 'badge-hackathons';

    const tagsArray = exp.tags ? exp.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    return `
      <div class="experience-card glass-sheen" data-index="${idx}">
        <div class="exp-badge-row">
          <span class="exp-role-badge ${badgeClass}">${exp.badge || 'EXPERIENCE'}</span>
        </div>
        <h3 class="exp-role-title">${exp.role_title}</h3>
        <div class="exp-company-row">
          <i class="fas fa-building-columns"></i>
          <span>${exp.company}</span>
        </div>
        ${exp.duration_location ? `
          <div class="exp-date-pill">
            <i class="far fa-calendar-alt"></i> ${exp.duration_location}
          </div>
        ` : ''}
        <p class="exp-desc">${exp.description || ''}</p>
        <div class="exp-divider"></div>
        <div class="exp-tags-list">
          ${tagsArray.map(tag => `<span class="exp-tech-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Generate indicator dots
  const dotsContainer = document.getElementById('experience-dots-bar');
  if (dotsContainer) {
    const isMobile = window.innerWidth <= 860;
    const cardsPerView = isMobile ? 1 : 2;
    const dotCount = Math.max(1, experiences.length - cardsPerView + 1);

    dotsContainer.innerHTML = Array.from({ length: dotCount }).map((_, i) => `
      <button class="exp-dot ${i === 0 ? 'active' : ''}" aria-label="Go to slide ${i + 1}" onclick="goToExperienceSlide(${i})"></button>
    `).join('');
  }

  // Window resize handler
  if (!window._expResizeHandlerAttached) {
    window.addEventListener('resize', () => {
      updateExperienceSlider();
    });
    window._expResizeHandlerAttached = true;
  }

  // Touch swipe
  let touchStartX = 0;
  let touchEndX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  track.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) window.navigateExperience(1);
    else if (touchEndX - touchStartX > 50) window.navigateExperience(-1);
  }, { passive: true });

  updateExperienceSlider();
}

function hydrateProjects(projects) {
  const container = document.getElementById('projects-track');
  if (!container || !projects.length) return;
  container.innerHTML = projects.map(p => `
    <div class="project-card glass-sheen" data-id="${p.id}">
      <div class="project-thumb-box">
        <img src="${p.media_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80'}" alt="${p.title}" loading="lazy">
        <span class="project-category-badge">${p.category}</span>
      </div>
      <div class="project-info-box">
        <div>
          <h3 class="project-title">${p.title}</h3>
          <p class="project-desc">${p.description || ''}</p>
        </div>
        <div class="project-links">
          ${p.live_url ? `
            <a href="${p.live_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
              <i class="fas fa-arrow-up-right-from-square"></i> Live Demo
            </a>
          ` : ''}
          ${p.github_url ? `
            <a href="${p.github_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
              <i class="fab fa-github"></i> Code
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function hydrateEducation(eduList) {
  const container = document.getElementById('education-timeline');
  if (!container || !eduList.length) return;
  container.innerHTML = eduList.map(e => `
    <div class="timeline-card" data-id="${e.id}">
      <span class="timeline-year-badge">${e.pass_year}</span>
      <h3 class="timeline-degree">${e.degree}</h3>
      <div class="timeline-institution">${e.institution}</div>
      ${e.grade_or_details ? `<div class="timeline-details">${e.grade_or_details}</div>` : ''}
    </div>
  `).join('');
}

function hydrateCertifications(certs) {
  const container = document.getElementById('certs-grid');
  if (!container || !certs.length) return;

  const fallbackThumbnails = [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80', // Cybersecurity / Cyber matrix
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80', // Network / Web technology
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=600&q=80', // Python Full Stack
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80', // AI / Machine Learning
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80', // AI Quiz / Innovation
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80', // Hackathon / Coding challenge
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'  // AWS / Cloud
  ];

  container.innerHTML = certs.map((c, index) => {
    let certImg = (c.image_url && c.image_url.trim() !== '') ? c.image_url : null;
    if (!certImg) {
      const t = (c.title || '').toLowerCase();
      if (t.includes('cyber') || t.includes('security')) certImg = fallbackThumbnails[0];
      else if (t.includes('network') || t.includes('web')) certImg = fallbackThumbnails[1];
      else if (t.includes('python') || t.includes('stack')) certImg = fallbackThumbnails[2];
      else if (t.includes('soar') || t.includes('ai') || t.includes('microsoft')) certImg = fallbackThumbnails[3];
      else if (t.includes('quiz')) certImg = fallbackThumbnails[4];
      else if (t.includes('hack') || t.includes('bob')) certImg = fallbackThumbnails[5];
      else certImg = fallbackThumbnails[index % fallbackThumbnails.length];
    }

    return `
      <div class="cert-card" data-image="${certImg}" data-title="${c.title}" data-id="${c.id}">
        <div class="cert-preview-wrapper">
          <img src="${certImg}" alt="${c.title}" class="cert-preview-img" loading="lazy">
          <div class="cert-badge-overlay"><i class="fas fa-award"></i></div>
        </div>
        <div class="cert-details">
          <h3 class="cert-title">${c.title}</h3>
          <div class="cert-issuer">
            <span><i class="fas fa-building-columns" style="font-size: 0.75rem; color: var(--accent-primary);"></i> ${c.issuer}</span>
            ${c.issue_date ? `<span style="opacity: 0.7;">• ${c.issue_date}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach modal view clicks on certificate cards
  document.querySelectorAll('.cert-card').forEach(card => {
    card.addEventListener('click', () => {
      const imgUrl = card.getAttribute('data-image');
      const title = card.getAttribute('data-title');
      openCertModal(imgUrl, title);
    });
  });
}

function hydrateReviews(reviews) {
  const container = document.getElementById('reviews-grid');
  if (!container || !reviews.length) return;
  container.innerHTML = reviews.map(r => `
    <div class="review-card glass-sheen" data-id="${r.id}">
      <div>
        <div class="stars-rating">
          ${Array(r.rating || 5).fill('<i class="fas fa-star"></i>').join('')}
        </div>
        <p class="review-quote-text">"${r.review_text}"</p>
      </div>
      <div class="reviewer-meta">
        <div class="reviewer-avatar-placeholder">
          ${(r.client_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="reviewer-name">${r.client_name}</div>
          <div class="reviewer-role">${r.role_company}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function hydrateCustomBlocks(blocks) {
  const container = document.getElementById('custom-blocks-container');
  if (!container || !blocks.length) return;
  container.innerHTML = blocks.map(b => `
    <div class="custom-block-wrapper" data-id="${b.id}">
      ${b.content_html}
    </div>
  `).join('');
}

/* ==========================================================================
   REVIEW MODAL & SUBMISSION SYSTEM
   ========================================================================== */

function initReviewModal() {
  const openBtn = document.getElementById('open-review-modal-btn');
  const modal = document.getElementById('review-modal');
  const closeBtn = document.getElementById('close-review-modal-btn');
  const form = document.getElementById('public-review-form');
  const textInput = document.getElementById('review-text-input');
  const charCounter = document.getElementById('review-char-count');
  const starsContainer = document.getElementById('star-rating-picker');

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener('click', () => modal.classList.add('open'));
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Star Rating Interaction
  let selectedRating = 5;
  if (starsContainer) {
    const starIcons = starsContainer.querySelectorAll('i');
    starIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        selectedRating = parseInt(icon.getAttribute('data-rating')) || 5;
        starIcons.forEach(i => {
          const r = parseInt(i.getAttribute('data-rating'));
          if (r <= selectedRating) {
            i.classList.add('active');
            i.classList.replace('far', 'fas');
          } else {
            i.classList.remove('active');
            i.classList.replace('fas', 'far');
          }
        });
      });
    });
  }

  // Char Counter
  if (textInput && charCounter) {
    textInput.addEventListener('input', () => {
      charCounter.textContent = `${textInput.value.length}/300`;
    });
  }

  // Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const client_name = document.getElementById('reviewer-name-input').value.trim();
      const role_company = document.getElementById('reviewer-role-input').value.trim();
      const review_text = textInput.value.trim();

      if (!client_name || !role_company || !review_text) {
        showToast('Please fill out all fields.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/reviews/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name,
            role_company,
            rating: selectedRating,
            review_text
          })
        });

        const result = await res.json();
        if (result.success) {
          showToast(result.message || 'Review submitted for approval!');
          form.reset();
          if (charCounter) charCounter.textContent = '0/300';
          modal.classList.remove('open');
        } else {
          showToast(result.message || 'Failed to submit review', 'error');
        }
      } catch (err) {
        showToast('Submission error. Please check connection.', 'error');
      }
    });
  }
}

/* ==========================================================================
   CERTIFICATE MODAL VIEWER
   ========================================================================== */

function initCertModal() {
  const modal = document.getElementById('cert-modal');
  const closeBtn = document.getElementById('close-cert-modal-btn');
  if (!modal) return;

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function openCertModal(imageUrl, title) {
  const modal = document.getElementById('cert-modal');
  const modalImg = document.getElementById('cert-modal-img');
  const modalTitle = document.getElementById('cert-modal-title');
  if (!modal || !modalImg) return;

  modalImg.src = imageUrl || '';
  if (modalTitle) modalTitle.textContent = title || 'Certificate';
  modal.classList.add('open');
}

/* ==========================================================================
   TOAST NOTIFICATION HELPER
   ========================================================================== */

function showToast(msg, type = 'success') {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color: ${type === 'error' ? '#f43f5e' : 'var(--accent-primary)'}"></i> <span>${msg}</span>`;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
