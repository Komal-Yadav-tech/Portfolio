/**
 * Magnetic Attraction Effect on Interactive Buttons & Badges
 */

(function initMagneticElements() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  function applyMagneticEffect() {
    const magneticItems = document.querySelectorAll('.btn-primary, .theme-toggle-btn, .admin-link-btn, .service-icon-box');

    magneticItems.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * 0.28}px, ${y * 0.28}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px)';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.transition = 'transform 0.1s ease';
      });
    });
  }

  applyMagneticEffect();
  window.applyMagneticEffect = applyMagneticEffect;
})();
