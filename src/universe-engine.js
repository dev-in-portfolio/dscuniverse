// ==========================================================================
// DARK STAR UNIVERSE — HIGH-PERFORMANCE MULTI-LAYER SPATIAL ENGINE
// Incorporates 3-Band Starfield, Pre-rendered Gas Nebulae, Gravitational Core,
// Regional Division Color Ambience, Scroll Parallax, and Node Interactions.
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initUniverseEngine();
  initQuickNavSmoothScroll();
  initNodeHoverListeners();
});

let hoveredNodeId = null;

function initNodeHoverListeners() {
  const cards = document.querySelectorAll('.world-node-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => { hoveredNodeId = card.id; });
    card.addEventListener('mouseleave', () => { if (hoveredNodeId === card.id) hoveredNodeId = null; });
    card.addEventListener('focus', () => { hoveredNodeId = card.id; });
    card.addEventListener('blur', () => { if (hoveredNodeId === card.id) hoveredNodeId = null; });
  });
}

function initUniverseEngine() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  
  let W, H, dpr;
  let scrollY = window.scrollY;
  let targetMouseX = 0, targetMouseY = 0;
  let currentMouseX = 0, currentMouseY = 0;
  let isRunning = true;
  let animationFrameId = null;

  // Regional Division Color Profiles (Hue in degrees)
  const divisionColors = {
    'world-web': { hue: 190, r: 6, g: 182, b: 212 },      // Electric Cyan
    'world-culinary': { hue: 42, r: 223, g: 178, b: 96 },   // Ember Gold
    'world-usda': { hue: 155, r: 16, g: 185, b: 129 },     // Precision Emerald
    'world-literary': { hue: 270, r: 168, g: 85, b: 247 },  // Celestial Violet
    'world-art': { hue: 345, r: 244, g: 63, b: 94 },       // Chromatic Rose
    'world-appdev': { hue: 239, r: 99, g: 102, b: 241 }    // Product Indigo
  };

  let activeRegionHue = 42; // Default Ember Gold
  let currentRegionR = 223, currentRegionG = 178, currentRegionB = 96;

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

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY || window.pageYOffset;
  }, { passive: true });

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX - W / 2) * 0.05;
    targetMouseY = (e.clientY - H / 2) * 0.05;
  }, { passive: true });

  // 1. PRE-RENDER OFFSCREEN NEBULA PUFF BUFFERS
  const nebulaCache = [];
  const nebulaHues = [42, 190, 270, 155, 345];
  nebulaHues.forEach(hue => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 300;
    offCanvas.height = 300;
    const offCtx = offCanvas.getContext('2d');
    const grad = offCtx.createRadialGradient(150, 150, 0, 150, 150, 150);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0.18)`);
    grad.addColorStop(0.4, `hsla(${hue}, 65%, 45%, 0.07)`);
    grad.addColorStop(1, 'transparent');
    offCtx.fillStyle = grad;
    offCtx.beginPath();
    offCtx.arc(150, 150, 150, 0, Math.PI * 2);
    offCtx.fill();
    nebulaCache[hue] = offCanvas;
  });

  // 2. GENERATE DRIFTING NEBULA CLOUDS
  const nebulaClouds = [];
  const cloudCount = W < 768 ? 6 : 14;
  for (let i = 0; i < cloudCount; i++) {
    nebulaClouds.push({
      x: Math.random() * W,
      y: Math.random() * H * 2.5,
      scale: 1.2 + Math.random() * 2.5,
      hue: nebulaHues[i % nebulaHues.length],
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      phase: Math.random() * Math.PI * 2,
      depthFactor: 0.05 + Math.random() * 0.1
    });
  }

  // 3. GENERATE 3-BAND DEEP STARFIELD
  const starsFar = [];
  const starsMid = [];
  const starsNear = [];

  const farCount = W < 768 ? 70 : 160;
  const midCount = W < 768 ? 40 : 90;
  const nearCount = W < 768 ? 15 : 35;

  for (let i = 0; i < farCount; i++) {
    starsFar.push({
      x: Math.random() * W,
      y: Math.random() * H * 3,
      size: 0.4 + Math.random() * 0.6,
      alpha: 0.15 + Math.random() * 0.25
    });
  }

  for (let i = 0; i < midCount; i++) {
    starsMid.push({
      x: Math.random() * W,
      y: Math.random() * H * 3,
      size: 0.9 + Math.random() * 0.7,
      alpha: 0.3 + Math.random() * 0.4,
      hue: Math.random() > 0.6 ? 42 : (Math.random() > 0.5 ? 190 : 270),
      twinkleSpeed: 0.02 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < nearCount; i++) {
    starsNear.push({
      x: Math.random() * W,
      y: Math.random() * H * 3,
      size: 1.8 + Math.random() * 1.5,
      alpha: 0.5 + Math.random() * 0.4,
      hue: 42 + Math.random() * 20,
      twinkleSpeed: 0.04 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2
    });
  }

  // 4. GRAVITATIONAL STARDUST PARTICLES
  const stardustCount = W < 768 ? 35 : 85;
  const stardust = [];
  for (let i = 0; i < stardustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * (Math.max(W, H) * 0.6);
    stardust.push({
      angle,
      distance,
      baseDistance: distance,
      speed: (0.0005 + Math.random() * 0.0015),
      size: 1.0 + Math.random() * 2.0,
      alpha: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2
    });
  }

  // 5. RARE OCCASIONAL METEOR
  let activeMeteor = null;
  function trySpawnMeteor() {
    if (!activeMeteor && Math.random() < 0.0025 && !isReducedMotion) {
      const angle = Math.PI * 0.7 + (Math.random() - 0.5) * 0.3;
      const speed = 7 + Math.random() * 6;
      activeMeteor = {
        x: Math.random() * W,
        y: scrollY + Math.random() * (H * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.01,
        trail: [],
        hue: 35 + Math.random() * 20
      };
    }
  }

  let time = 0;

  // MAIN RENDER LOOP
  function render() {
    if (!isRunning) return;
    time += 0.006;

    // Smooth mouse parallax lerp
    currentMouseX += (targetMouseX - currentMouseX) * 0.05;
    currentMouseY += (targetMouseY - currentMouseY) * 0.05;

    // Determine nearest division node on scroll for regional color transition
    const viewportCenterY = scrollY + H / 2;
    let closestNodeId = null;
    let minDistance = Infinity;

    const cards = document.querySelectorAll('.world-node-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardCenterY = scrollY + rect.top + rect.height / 2;
      const dist = Math.abs(viewportCenterY - cardCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        closestNodeId = card.id;
      }
    });

    if (hoveredNodeId) closestNodeId = hoveredNodeId;

    if (closestNodeId && divisionColors[closestNodeId]) {
      const target = divisionColors[closestNodeId];
      activeRegionHue += (target.hue - activeRegionHue) * 0.04;
      currentRegionR += (target.r - currentRegionR) * 0.04;
      currentRegionG += (target.g - currentRegionG) * 0.04;
      currentRegionB += (target.b - currentRegionB) * 0.04;
    }

    ctx.clearRect(0, 0, W, H);

    // LAYER 1: FAR STARFIELD (Slowest Parallax)
    const farParallax = (scrollY * 0.04) % (H * 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 0; i < starsFar.length; i++) {
      const s = starsFar[i];
      const renderY = (s.y - farParallax + H * 3) % (H * 3);
      if (renderY < H + 10) {
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, renderY, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // LAYER 2: MID NEBULA CLOUDS & MID STARFIELD
    const midParallax = (scrollY * 0.09);
    for (let i = 0; i < nebulaClouds.length; i++) {
      const cloud = nebulaClouds[i];
      if (!isReducedMotion) {
        cloud.x += cloud.vx;
        cloud.y += cloud.vy;
      }

      const renderY = (cloud.y - midParallax * cloud.depthFactor + H * 2) % (H * 2);
      if (renderY > -200 && renderY < H + 200) {
        const cachedImg = nebulaCache[cloud.hue] || nebulaCache[42];
        const cloudSize = 300 * cloud.scale;
        ctx.globalAlpha = 0.5 + Math.sin(time + cloud.phase) * 0.15;
        ctx.drawImage(cachedImg, cloud.x + currentMouseX * 0.5 - cloudSize / 2, renderY + currentMouseY * 0.5 - cloudSize / 2, cloudSize, cloudSize);
      }
    }
    ctx.globalAlpha = 1.0;

    // Mid Twinkling Stars
    for (let i = 0; i < starsMid.length; i++) {
      const s = starsMid[i];
      const renderY = (s.y - midParallax + H * 3) % (H * 3);
      if (renderY < H + 10) {
        const twinkle = isReducedMotion ? s.alpha : s.alpha * (0.6 + Math.sin(time * 3 + s.phase) * 0.4);
        ctx.fillStyle = `hsla(${s.hue}, 70%, 75%, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(s.x + currentMouseX * 0.8, renderY + currentMouseY * 0.8, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // LAYER 3: GRAVITATIONAL DARK STAR CORE (Center of Screen & Atmosphere)
    const centerX = W / 2 + currentMouseX * 1.2;
    const centerY = (H / 2 - scrollY * 0.15) + currentMouseY * 1.2;
    const coreRadius = Math.min(W, H) * 0.07 + 22;

    // Core Regional Ambient Aura
    const auraGrad = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.5, centerX, centerY, coreRadius * 4.5);
    auraGrad.addColorStop(0, `rgba(${Math.round(currentRegionR)}, ${Math.round(currentRegionG)}, ${Math.round(currentRegionB)}, 0.22)`);
    auraGrad.addColorStop(0.5, `rgba(${Math.round(currentRegionR)}, ${Math.round(currentRegionG)}, ${Math.round(currentRegionB)}, 0.06)`);
    auraGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Event Horizon Luminous Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${Math.round(currentRegionR)}, ${Math.round(currentRegionG)}, ${Math.round(currentRegionB)}, 0.7)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Black Hole Shadow Center
    const eventHorizon = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    eventHorizon.addColorStop(0, '#000000');
    eventHorizon.addColorStop(0.75, '#030306');
    eventHorizon.addColorStop(1, `rgba(${Math.round(currentRegionR * 0.2)}, ${Math.round(currentRegionG * 0.2)}, ${Math.round(currentRegionB * 0.2)}, 0.95)`);
    ctx.fillStyle = eventHorizon;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // LAYER 4: GRAVITATIONAL STARDUST & NEAR BRIGHT STARS
    for (let i = 0; i < stardust.length; i++) {
      const p = stardust[i];
      if (!isReducedMotion) p.angle += p.speed;

      const r = p.distance;
      const x = centerX + Math.cos(p.angle) * r;
      const y = centerY + Math.sin(p.angle) * r;

      if (y > -20 && y < H + 20) {
        const alpha = p.alpha * (0.6 + Math.sin(time * 2 + p.phase) * 0.4);
        ctx.fillStyle = `hsla(${activeRegionHue}, 80%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Near Bright Anchor Stars with Starburst Cross Rays
    for (let i = 0; i < starsNear.length; i++) {
      const s = starsNear[i];
      const renderY = (s.y - scrollY * 0.18 + H * 3) % (H * 3);
      if (renderY > -10 && renderY < H + 10) {
        const twinkle = isReducedMotion ? s.alpha : s.alpha * (0.7 + Math.sin(time * 4 + s.phase) * 0.3);
        const renderX = s.x + currentMouseX * 1.5;

        // Draw Anchor Star Core
        ctx.fillStyle = `hsla(${s.hue}, 90%, 85%, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(renderX, renderY, s.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw Subtle Cross Flare for Anchor Stars
        if (s.size > 2.2 && !isReducedMotion) {
          ctx.strokeStyle = `hsla(${s.hue}, 90%, 85%, ${twinkle * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(renderX - s.size * 3, renderY);
          ctx.lineTo(renderX + s.size * 3, renderY);
          ctx.moveTo(renderX, renderY - s.size * 3);
          ctx.lineTo(renderX, renderY + s.size * 3);
          ctx.stroke();
        }
      }
    }

    // LAYER 5: DYNAMIC CONSTELLATION TIES TO IN-VIEW DIVISION NODES
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < H && rect.bottom > 0) {
        const nodeX = rect.left + rect.width / 2;
        const nodeY = rect.top + rect.height / 2;

        const isHovered = (hoveredNodeId === card.id);
        const opacity = isHovered ? 0.6 : Math.max(0, 1 - Math.abs(nodeY - H / 2) / (H * 0.75)) * 0.3;

        if (opacity > 0.02) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(nodeX, nodeY);
          ctx.strokeStyle = `rgba(${Math.round(currentRegionR)}, ${Math.round(currentRegionG)}, ${Math.round(currentRegionB)}, ${opacity})`;
          ctx.lineWidth = isHovered ? 2 : 1;
          ctx.setLineDash(isHovered ? [8, 4] : [4, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });

    // LAYER 6: DISTANT METEOR ACCENT
    trySpawnMeteor();
    if (activeMeteor) {
      const m = activeMeteor;
      m.x += m.vx;
      m.y += m.vy;
      m.life -= m.decay;
      m.trail.push({ x: m.x, y: m.y - scrollY });

      if (m.trail.length > 25) m.trail.shift();

      if (m.life <= 0 || m.x > W + 100 || m.y - scrollY > H + 100) {
        activeMeteor = null;
      } else {
        // Draw Meteor Trail
        for (let t = 0; t < m.trail.length; t++) {
          const frac = t / m.trail.length;
          const trailY = m.trail[t].y;
          if (trailY > -20 && trailY < H + 20) {
            ctx.fillStyle = `hsla(${m.hue}, 95%, 75%, ${frac * m.life * 0.4})`;
            ctx.beginPath();
            ctx.arc(m.trail[t].x, trailY, frac * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    if (!isReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  // Render initial static or animated state
  if (isReducedMotion) {
    render();
  } else {
    render();
  }

  // Visibility state handling for battery/performance savings
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      if (!isRunning && !isReducedMotion) {
        isRunning = true;
        render();
      }
    }
  });
}

// Smooth Scroll Jump for Quick Nav Links
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
