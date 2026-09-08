/**
 * Custom Interactive Lagging Cursor with Magnetic States
 */

(function initCustomCursor() {
  const dot = document.querySelector('.custom-cursor-dot');
  const ring = document.querySelector('.custom-cursor-ring');
  if (!dot || !ring) return;

  // Don't activate on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  });

  // Smooth lerp loop for the ring
  function renderCursor() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;

    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Attach hover expand states to interactive elements
  function attachHoverStates() {
    const interactables = document.querySelectorAll('a, button, input, textarea, select, .project-card, .service-card, .cert-card, .review-card');
    interactables.forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('active-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('active-hover'));
    });
  }

  attachHoverStates();
  window.attachCursorHoverStates = attachHoverStates;
})();
