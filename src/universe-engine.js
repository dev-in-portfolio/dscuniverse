// ==========================================================================
// DARK STAR UNIVERSE — SPATIAL ENGINE & CANVAS RENDERER
// Combines Gravitational Blackhole Core, Accretion Corona, and Constellation Ties
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initUniverseEngine();
  initQuickNavSmoothScroll();
});

function initUniverseEngine() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let animationFrameId = null;

  function setCanvasSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);

  // Particles & Orbital Physics
  const particleCount = Math.min(W < 768 ? 50 : 130, 150);
  const particles = [];
  const cx = W / 2;
  const cy = H / 2;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * (Math.max(W, H) * 0.5);
    const speed = (0.0005 + Math.random() * 0.0015) * (distance < 120 ? 1.8 : 1.0);
    particles.push({
      angle,
      distance,
      baseDistance: distance,
      speed,
      size: 1.2 + Math.random() * 2.2,
      alpha: 0.15 + Math.random() * 0.6,
      hue: Math.random() > 0.5 ? 40 + Math.random() * 20 : (Math.random() > 0.5 ? 190 + Math.random() * 40 : 270 + Math.random() * 40),
      wobbleAmp: 2 + Math.random() * 5,
      phase: Math.random() * Math.PI * 2
    });
  }

  let time = 0;
  let isRunning = true;

  function render() {
    if (!isRunning) return;

    time += 0.006;
    ctx.clearRect(0, 0, W, H);

    const centerX = W / 2;
    const centerY = H / 2;

    // 1. Central Dark Star Accretion Corona (Fixed in viewport center background)
    const coreRadius = Math.min(W, H) * 0.08 + 25;
    
    // Outer Accretion Glow
    const outerGlow = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.8, centerX, centerY, coreRadius * 3.5);
    outerGlow.addColorStop(0, 'rgba(223, 178, 96, 0.25)');
    outerGlow.addColorStop(0.3, 'rgba(168, 85, 247, 0.12)');
    outerGlow.addColorStop(0.7, 'rgba(6, 182, 212, 0.05)');
    outerGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Event Horizon Luminous Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(223, 178, 96, 0.6)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#dfb260';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Black Hole Shadow Center
    const eventHorizon = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    eventHorizon.addColorStop(0, '#000000');
    eventHorizon.addColorStop(0.8, '#030306');
    eventHorizon.addColorStop(1, 'rgba(10, 5, 18, 0.9)');
    ctx.fillStyle = eventHorizon;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Render Orbiting Particles & Gravitational Gravitation
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.speed;

      const wobble = Math.sin(time * 1.2 + p.phase + p.angle) * p.wobbleAmp;
      const r = p.distance + wobble;
      const x = centerX + Math.cos(p.angle) * r;
      const y = centerY + Math.sin(p.angle) * r;

      const alpha = p.alpha * (0.6 + Math.sin(time + p.phase) * 0.4);
      
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;
      ctx.fill();
    }

    // 3. Connect Active World Nodes to Core via Constellation Rays
    const nodeCards = document.querySelectorAll('.world-node-card');
    nodeCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      // Check if node is visible in viewport
      if (rect.top < H && rect.bottom > 0) {
        const nodeX = rect.left + rect.width / 2;
        const nodeY = rect.top + rect.height / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(nodeX, nodeY);
        
        const opacity = Math.max(0, 1 - Math.abs(nodeY - centerY) / (H * 0.8)) * 0.25;
        ctx.strokeStyle = `rgba(223, 178, 96, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    animationFrameId = requestAnimationFrame(render);
  }

  render();

  // Visibility state handling for performance
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      if (!isRunning) {
        isRunning = true;
        render();
      }
    }
  });
}

// Smooth Scroll Jump for Mobile Quick Nav Links
function initQuickNavSmoothScroll() {
  const quickLinks = document.querySelectorAll('.quick-nav-item');
  quickLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });
}
