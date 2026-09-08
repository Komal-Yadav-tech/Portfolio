/**
 * Three.js Interactive 3D Ambient Particle Constellation Background
 */

(function initThreeScene() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 80;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles Geometry
  const particleCount = 700;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 200;
    positions[i + 1] = (Math.random() - 0.5) * 200;
    positions[i + 2] = (Math.random() - 0.5) * 150;
    scales[i / 3] = Math.random() * 1.5 + 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  // Helper to extract CSS Accent color
  function getThemeColor() {
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
    return computed ? new THREE.Color(computed) : new THREE.Color('#38bdf8');
  }

  const material = new THREE.PointsMaterial({
    color: getThemeColor(),
    size: 1.6,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  });

  const particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);

  // Mouse Interaction Parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Watch for theme changes to update particle color
  const observer = new MutationObserver(() => {
    material.color = getThemeColor();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

  // Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    targetX += (mouseX * 15 - targetX) * 0.05;
    targetY += (mouseY * 15 - targetY) * 0.05;

    particlesMesh.rotation.y = elapsedTime * 0.04 + targetX * 0.02;
    particlesMesh.rotation.x = elapsedTime * 0.02 + targetY * 0.02;

    renderer.render(scene, camera);
  }

  animate();

  // Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
})();
