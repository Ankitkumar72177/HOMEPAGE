// Particle Animation Script
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

// Detect mobile devices
function isMobile() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get optimal particle count based on device
function getParticleCount() {
  if (isMobile()) {
    return 80; // Reduced particles for mobile
  }
  return 250; // Full particles for desktop
}

// Initialize canvas and particles
function init() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  // Create particles based on device type
  const particleCount = getParticleCount();
  particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 2.5,
    vy: (Math.random() - 0.5) * 2.5,
    alpha: Math.random() * 0.5 + 0.3,
    color: `hsl(${Math.random() * 60 + 240}, 100%, 70%)`,
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.05
  }));
}

// Animation loop
let lastTime = 0;
function animate(currentTime = 0) {
  // Throttle frame rate on mobile for better performance
  const targetFPS = isMobile() ? 30 : 60;
  const interval = 1000 / targetFPS;
  
  if (currentTime - lastTime < interval) {
    requestAnimationFrame(animate);
    return;
  }
  lastTime = currentTime;

  ctx.clearRect(0, 0, width, height);

  // Draw particles
  particles.forEach(p => {
    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Bounce off walls
    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    // Add subtle oscillation
    p.angle += p.rotationSpeed;
    p.vx += Math.cos(p.angle) * 0.01;
    p.vy += Math.sin(p.angle) * 0.01;

    // Apply damping
    p.vx *= 0.97;
    p.vy *= 0.97;

    // Draw particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Connect nearby particles (optimized for mobile)
  const connectionDistance = isMobile() ? 100 : 140; // Shorter connections on mobile
  const maxConnections = isMobile() ? 50 : 100; // Limit connections on mobile
  let connectionCount = 0;
  
  for (let i = 0; i < particles.length && connectionCount < maxConnections; i++) {
    for (let j = i + 1; j < particles.length && connectionCount < maxConnections; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < connectionDistance) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / connectionDistance})`;
        ctx.lineWidth = isMobile() ? 0.2 : 0.4; // Thinner lines on mobile
        ctx.stroke();
        connectionCount++;
      }
    }
  }

  requestAnimationFrame(animate);
}

// Handle window resize
function handleResize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  
  // Adjust particle count if device type changed (e.g., rotation)
  const newParticleCount = getParticleCount();
  if (particles.length !== newParticleCount) {
    // Recreate particles with new count
    init();
  } else {
    // Just reposition existing particles
    particles = particles.map(p => ({
      ...p,
      x: Math.random() * width,
      y: Math.random() * height
    }));
  }
}

// Initialize and start animation
window.onload = () => {
  init();
  animate();
};

window.addEventListener('resize', handleResize);