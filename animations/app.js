/**
 * Master Animation Orchestrator (GSAP 3, ScrollTrigger, Cinematic Splash Screen & UI Controller)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Cinematic Welcome / Splash Screen Execution
  const splash = document.getElementById('welcome-screen') || document.getElementById('splash-screen');
  let hasTransitioned = false;

  function endSplashScreen() {
    if (!splash || hasTransitioned) return;
    hasTransitioned = true;
    splash.classList.add('hidden');
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
      splash.style.display = 'none';
      initHeroAnimations();
    }, 800);
  }

  if (splash) {
    // Auto-transition timer (2.8s) to transition to the hero page
    const splashTimer = setTimeout(() => {
      endSplashScreen();
    }, 2800);

    // Instant click anywhere to skip/transition immediately
    splash.addEventListener('click', () => {
      clearTimeout(splashTimer);
      endSplashScreen();
    });

    // Keyboard and interaction triggers
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Escape') {
        clearTimeout(splashTimer);
        endSplashScreen();
      }
    }, { once: true });
  } else {
    initHeroAnimations();
  }

  // 2. Hero Section Animations
  function initHeroAnimations() {
    if (typeof gsap === 'undefined') return;

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });

    heroTl.from('.hero-greeting', { opacity: 0, y: 20, duration: 0.8 })
          .from('.hero-name', { opacity: 0, y: 30, duration: 0.9 }, '-=0.5')
          .from('.hero-title-gradient', { opacity: 0, y: 30, duration: 0.9 }, '-=0.6')
          .from('.hero-bio', { opacity: 0, y: 20, duration: 0.8 }, '-=0.5')
          .from('.availability-badge', { opacity: 0, scale: 0.9, duration: 0.6 }, '-=0.4')
          .from('.hero-cta-group', { opacity: 0, y: 20, duration: 0.8 }, '-=0.4')
          .from('.hero-visual', { opacity: 0, scale: 0.85, duration: 1.2, ease: 'back.out(1.4)' }, '-=1.2')
          .from('.floating-stat-badge', { opacity: 0, y: 30, duration: 0.8 }, '-=0.6');

    initScrollAnimations();
  }

  // 3. ScrollTrigger Reveals
  function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Section Titles
    gsap.utils.toArray('.section-header').forEach((header) => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: 'power3.out'
      });
    });

    // Services Cards Stagger
    if (document.querySelector('.services-grid')) {
      gsap.from('.service-card', {
        scrollTrigger: {
          trigger: '.services-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 50,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    }

    // Horizontal Projects Track Pinned Scroll
    const projectTrack = document.querySelector('.horizontal-track');
    const projectWrapper = document.querySelector('.horizontal-scroll-wrapper');

    if (projectTrack && projectWrapper && window.innerWidth > 992) {
      function getScrollAmount() {
        return -(projectTrack.scrollWidth - projectWrapper.offsetWidth + 80);
      }

      gsap.to(projectTrack, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: document.querySelector('#projects') ? '#projects' : '#portfolio',
          start: 'top top',
          end: () => `+=${projectTrack.scrollWidth - projectWrapper.offsetWidth + 300}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    }

    // Education & About Cards
    gsap.utils.toArray('.timeline-card').forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        x: -30,
        duration: 0.8,
        ease: 'power3.out'
      });
    });

    // 3-Step Process
    if (document.querySelector('.process-grid')) {
      gsap.from('.process-step-card', {
        scrollTrigger: {
          trigger: '.process-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 40,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power3.out'
      });
    }

    // Quote Box
    const quoteBox = document.querySelector('.quote-card-box');
    if (quoteBox) {
      gsap.from(quoteBox, {
        scrollTrigger: {
          trigger: quoteBox,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        scale: 0.95,
        duration: 1,
        ease: 'power3.out'
      });
    }

    // Certifications Stagger
    if (document.querySelector('.certs-grid')) {
      gsap.from('.cert-card', {
        scrollTrigger: {
          trigger: '.certs-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    }

    // Testimonials Grid
    if (document.querySelector('.reviews-grid')) {
      gsap.from('.review-card', {
        scrollTrigger: {
          trigger: '.reviews-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    }
  }

  // 4. Header Scroll State
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 5. Active Section IntersectionObserver Spy
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else if (link.getAttribute('href').startsWith('#')) {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach((sec) => sectionObserver.observe(sec));

  // 6. Mobile Menu Drawer Toggle
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  const mobileClose = document.querySelector('.mobile-drawer-close');
  const mobileLinks = document.querySelectorAll('.mobile-menu-list .nav-link');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => mobileDrawer.classList.add('open'));
    if (mobileClose) mobileClose.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    });
  }
});
