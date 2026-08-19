// DARK STAR UNIVERSE ENGINE
// Integrates spatial particles, gravitational central core, and orbital projection dynamics

document.addEventListener('DOMContentLoaded', () => {
  initUniverseEngine();
});

function initUniverseEngine() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Galaxy Particles
  const particles = [];
  const particleCount = Math.min(width < 768 ? 60 : 160, 200);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (Math.min(width, height) * 0.45);
    particles.push({
      angle: angle,
      distance: distance,
      speed: (0.0005 + Math.random() * 0.001) * (distance < 100 ? 2 : 1),
      radius: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      color: Math.random() > 0.6 ? '#dfb260' : (Math.random() > 0.3 ? '#06b6d4' : '#a855f7')
    });
  }

  // Node Positions and Orbit Angles
  const nodes = [
    { id: 'node-web', radiusPct: 0.28, angle: 0 },
    { id: 'node-culinary', radiusPct: 0.32, angle: (Math.PI * 2) / 5 },
    { id: 'node-usda', radiusPct: 0.30, angle: ((Math.PI * 2) / 5) * 2 },
    { id: 'node-literary', radiusPct: 0.34, angle: ((Math.PI * 2) / 5) * 3 },
    { id: 'node-art', radiusPct: 0.29, angle: ((Math.PI * 2) / 5) * 4 }
  ];

  let rotationOffset = 0;

  function render() {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Render Gravitational Central Core (Dark Star Engine)
    const coreGlow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 120);
    coreGlow.addColorStop(0, 'rgba(223, 178, 96, 0.8)');
    coreGlow.addColorStop(0.3, 'rgba(168, 85, 247, 0.3)');
    coreGlow.addColorStop(0.7, 'rgba(6, 182, 212, 0.1)');
    coreGlow.addColorStop(1, 'rgba(3, 3, 6, 0)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#dfb260';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Render Particle Field & Constellation Ties
    particles.forEach((p, idx) => {
      p.angle += p.speed;
      const x = centerX + Math.cos(p.angle) * p.distance;
      const y = centerY + Math.sin(p.angle) * p.distance;

      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 3. Update HTML Node Positions along Orbital Paths (Desktop layout)
    if (window.innerWidth > 900) {
      rotationOffset += 0.0008;
      const orbitBaseRadius = Math.min(width, height) * 0.36;

      nodes.forEach(n => {
        const el = document.getElementById(n.id);
        if (el) {
          const currentAngle = n.angle + rotationOffset;
          const nodeX = centerX + Math.cos(currentAngle) * (orbitBaseRadius * (n.radiusPct / 0.3));
          const nodeY = centerY + Math.sin(currentAngle) * (orbitBaseRadius * (n.radiusPct / 0.3));

          el.style.left = `${nodeX}px`;
          el.style.top = `${nodeY}px`;

          // Draw orbital connection ray
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(nodeX, nodeY);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    requestAnimationFrame(render);
  }

  render();
}
