// Particle Animation Script
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

// Initialize canvas and particles
function init() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  // Create 250 particles
  particles = Array.from({ length: 250 }, () => ({
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
function animate() {
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

  // Connect nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 140) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / 140})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(animate);
}

// Handle window resize
function handleResize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  particles = particles.map(p => ({
    ...p,
    x: Math.random() * width,
    y: Math.random() * height
  }));
}

// Initialize and start animation
window.onload = () => {
  init();
  animate();
};

window.addEventListener('resize', handleResize);