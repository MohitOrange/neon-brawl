// Neon Brawl — the arena: a realistic outdoor valley outpost.
// Daytime sky, drifting clouds, layered mountains and forests, grassy dirt ground,
// wooden / steel / rock platforms, concrete bunkers, sandbags, jeeps and ammo crates.
const World = (() => {
  const M = NB.MAP;
  const GROUND = 1650;
  let seed = 9871;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.ceil(h); return c; };

  // ------------------------------------------------- terrain ridges --
  // midpoint displacement → natural-looking mountain / hill profiles
  function ridge(w, step, amp, rough) {
    const n = Math.ceil(w / step) + 1;
    let size = 1; while (size < n) size *= 2;
    const a = new Array(size + 1).fill(0);
    a[0] = rand(); a[size] = rand();
    for (let s = size; s > 1; s /= 2) {
      for (let i = s / 2; i < size; i += s) a[i] = (a[i - s / 2] + a[i + s / 2]) / 2 + (rand() - 0.5) * (s / size) * rough;
    }
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) { mn = Math.min(mn, a[i]); mx = Math.max(mx, a[i]); }
    return a.slice(0, n).map((v) => ((v - mn) / (mx - mn || 1)) * amp);
  }
  function fillRidge(g, pts, step, h, base) {
    g.beginPath(); g.moveTo(0, h);
    pts.forEach((v, i) => g.lineTo(i * step, h - base - v));
    g.lineTo((pts.length - 1) * step, h); g.closePath();
  }

  function pine(g, x, y, s, col, col2) {
    g.fillStyle = col;
    g.fillRect(x - s * 0.06, y - s * 0.25, s * 0.12, s * 0.25);
    for (let k = 0; k < 4; k++) {
      const ty = y - s * 0.18 - k * s * 0.22, tw = s * (0.42 - k * 0.08);
      g.beginPath(); g.moveTo(x - tw, ty); g.lineTo(x, ty - s * 0.36); g.lineTo(x + tw, ty); g.closePath(); g.fill();
      if (col2) { g.fillStyle = col2; g.beginPath(); g.moveTo(x, ty - s * 0.36); g.lineTo(x + tw, ty); g.lineTo(x + tw * 0.2, ty); g.closePath(); g.fill(); g.fillStyle = col; }
    }
  }

  // ------------------------------------------------- parallax layers --
  const SINK = 160; // each layer extends this far below the ground line so no sky shows through
  function layer(f, h, base, draw) {
    const w = Math.ceil(M.W * f + 2300 * (1 - f)) + 40;
    const c = mk(w, h);
    draw(c.getContext('2d'), w, h);
    return { c, f, h, base };
  }
  let layers = null;
  const buildLayers = () => [
    // far snowy mountains
    layer(0.06, 760, '#a7b9cc', (g, w, h) => {
      const st = 10, pts = ridge(w, st, 430, 1.3);
      const grad = g.createLinearGradient(0, h - 600, 0, h);
      grad.addColorStop(0, '#b6c7d8'); grad.addColorStop(1, '#a7b9cc');
      fillRidge(g, pts, st, h, SINK + 90); g.fillStyle = grad; g.fill();
      // snow caps
      g.save(); fillRidge(g, pts, st, h, SINK + 90); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.moveTo(0, 0);
      pts.forEach((v, i) => g.lineTo(i * st, h - SINK - 90 - Math.max(v - 70 - Math.sin(i * 1.7) * 18, 300)));
      g.lineTo(w, 0); g.closePath(); g.fill();
      // shaded faces
      g.fillStyle = 'rgba(70,90,120,0.18)';
      for (let i = 2; i < pts.length - 2; i++) if (pts[i] > pts[i - 1] && pts[i] > pts[i + 1]) {
        g.beginPath(); g.moveTo(i * st, h - SINK - 90 - pts[i]);
        g.lineTo(i * st + 160, h); g.lineTo(i * st + 30, h); g.closePath(); g.fill();
      }
      g.restore();
    }),
    // mid blue-grey range
    layer(0.16, 620, '#8197a9', (g, w, h) => {
      const st = 8, pts = ridge(w, st, 300, 1.1);
      const grad = g.createLinearGradient(0, h - 480, 0, h);
      grad.addColorStop(0, '#8fa4b5'); grad.addColorStop(1, '#7a90a2');
      fillRidge(g, pts, st, h, SINK + 50); g.fillStyle = grad; g.fill();
    }),
    // rolling green hills with distant trees
    layer(0.32, 520, '#6f8f52', (g, w, h) => {
      const st = 8, pts = ridge(w, st, 190, 0.8);
      const grad = g.createLinearGradient(0, h - 380, 0, h);
      grad.addColorStop(0, '#8aa86a'); grad.addColorStop(1, '#6f8f52');
      fillRidge(g, pts, st, h, SINK + 30); g.fillStyle = grad; g.fill();
      for (let i = 0; i < pts.length; i += 2) if (rand() < 0.35) {
        const x = i * st + rand() * 6, y = h - SINK - 30 - pts[i] + 4;
        pine(g, x, y, 18 + rand() * 14, '#5b7a45');
      }
      // farm fields
      g.globalAlpha = 0.25;
      for (let k = 0; k < 14; k++) { const x = rand() * w; g.fillStyle = rand() < 0.5 ? '#c9b26a' : '#9fbf6a'; g.fillRect(x, h - SINK - 20 - rand() * 40, 90 + rand() * 120, 10); }
      g.globalAlpha = 1;
    }),
    // near forest line
    layer(0.55, 470, '#4c6a35', (g, w, h) => {
      const st = 6, pts = ridge(w, st, 110, 0.6);
      fillRidge(g, pts, st, h, SINK + 10); g.fillStyle = '#4f6e37'; g.fill();
      for (let x = 0; x < w; x += 9 + rand() * 12) {
        const i = Math.min(pts.length - 1, Math.floor(x / st));
        const y = h - SINK - 10 - pts[i] + 10;
        pine(g, x, y, 60 + rand() * 70, rand() < 0.5 ? '#3c5a2b' : '#456533', 'rgba(255,255,220,0.07)');
      }
    })
  ];

  // ------------------------------------------------------- clouds --
  function cloudSprite(w, h) {
    const pad = h * 0.6;
    const c = mk(w + pad * 2, h + pad * 2), g = c.getContext('2d');
    g.translate(pad, pad);
    const n = 9 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const r = h * (0.2 + rand() * 0.25), x = r + rand() * (w - 2 * r), y = h * 0.55 + (rand() - 0.6) * h * 0.3;
      const gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(244,247,250,0.95)'); gr.addColorStop(1, 'rgba(230,236,244,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // flat soft-shaded base
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, h * 0.45, 0, h + pad);
    sh.addColorStop(0, 'rgba(180,195,215,0)'); sh.addColorStop(1, 'rgba(160,178,200,0.6)');
    g.fillStyle = sh; g.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    return c;
  }
  let clouds = null;
  const buildClouds = () => Array.from({ length: 9 }, (_, i) => {
    const w = 260 + rand() * 360;
    return { img: cloudSprite(w, w * 0.42), x: rand() * 3000, y: 60 + rand() * 520, f: 0.03 + (i % 3) * 0.03, v: 6 + rand() * 10, a: 0.75 + rand() * 0.25 };
  });

  // birds
  const birds = Array.from({ length: 7 }, (_, i) => ({ x: rand() * 3000, y: 120 + rand() * 300, v: 30 + rand() * 25, p: rand() * 6, s: 0.6 + rand() * 0.5, g: i % 3 }));

  // --------------------------------------------- ground + materials --
  let groundTile = null, groundPat = null, dirtPat = null, concretePat = null, woodPat = null;
  function buildMaterials(ctx) {
    // ground: grass blades on top (12px above the solid line), grass strip, then layered dirt with stones
    groundTile = mk(512, 330);
    let g = groundTile.getContext('2d');
    const top = 12;
    const dg = g.createLinearGradient(0, top, 0, 330);
    dg.addColorStop(0, '#6b4e31'); dg.addColorStop(0.35, '#5a412a'); dg.addColorStop(1, '#3a2a1c');
    g.fillStyle = dg; g.fillRect(0, top + 10, 512, 330);
    for (let k = 0; k < 4; k++) { // strata
      g.strokeStyle = `rgba(0,0,0,${0.07 + k * 0.02})`; g.lineWidth = 3;
      g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, top + 60 + k * 60 + Math.sin(x / 40 + k) * 6); g.stroke();
    }
    for (let i = 0; i < 70; i++) { // stones
      const x = rand() * 512, y = top + 30 + rand() * 290, r = 2 + rand() * 7;
      g.fillStyle = rand() < 0.5 ? '#7f6a55' : '#4d3a28';
      g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand(), 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.35, 0, 0, 7); g.fill();
    }
    for (let i = 0; i < 18; i++) { // roots
      g.strokeStyle = 'rgba(40,28,18,0.6)'; g.lineWidth = 1.5;
      let x = rand() * 512, y = top + 16; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (rand() - 0.5) * 14; y += 6 + rand() * 8; g.lineTo(x, y); } g.stroke();
    }
    const gg = g.createLinearGradient(0, top - 2, 0, top + 18);
    gg.addColorStop(0, '#7fb74f'); gg.addColorStop(1, '#4e7f30');
    g.fillStyle = gg; g.beginPath(); g.moveTo(0, top);
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, top + 14 + Math.sin(x * 0.3) * 3 + rand() * 4);
    g.lineTo(512, top); g.closePath(); g.fill();
    for (let i = 0; i < 260; i++) { // blades
      const x = rand() * 512, hgt = 4 + rand() * 11;
      g.strokeStyle = rand() < 0.5 ? '#86c255' : '#5f9a3a'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, top + 3); g.quadraticCurveTo(x + (rand() - 0.5) * 6, top - hgt * 0.5, x + (rand() - 0.5) * 7, top + 2 - hgt); g.stroke();
    }
    for (let i = 0; i < 10; i++) { // little flowers
      g.fillStyle = ['#f2e86d', '#ffffff', '#e8a0c8'][i % 3];
      g.beginPath(); g.arc(rand() * 512, top - 2 - rand() * 6, 1.8, 0, 7); g.fill();
    }
    groundPat = ctx.createPattern(groundTile, 'repeat-x');

    // dirt (for rock platforms)
    const dt = mk(128, 128); g = dt.getContext('2d');
    g.fillStyle = '#6a5442'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(rand() * 128, rand() * 128, 1 + rand() * 4, 0, 7); g.fill(); }
    dirtPat = ctx.createPattern(dt, 'repeat');

    // concrete
    const ct = mk(128, 128); g = ct.getContext('2d');
    g.fillStyle = '#8b8a80'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rand() * 0.05})`; g.fillRect(rand() * 128, rand() * 128, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
    g.strokeRect(0, 0, 128, 64); g.strokeRect(-64, 64, 128, 64); g.strokeRect(64, 64, 128, 64);
    concretePat = ctx.createPattern(ct, 'repeat');

    // wood planks
    const wt = mk(160, 24); g = wt.getContext('2d');
    const wg = g.createLinearGradient(0, 0, 0, 24); wg.addColorStop(0, '#a57a4c'); wg.addColorStop(1, '#7a5532');
    g.fillStyle = wg; g.fillRect(0, 0, 160, 24);
    g.strokeStyle = 'rgba(60,35,15,0.35)'; g.lineWidth = 1;
    for (let y = 4; y < 24; y += 5) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(50, y + 2, 100, y - 2, 160, y + 1); g.stroke(); }
    g.fillStyle = 'rgba(40,22,8,0.6)'; g.fillRect(78, 0, 2, 24);
    g.fillStyle = '#3d3d3d'; [6, 72, 86, 152].forEach((x) => { g.beginPath(); g.arc(x, 6, 1.6, 0, 7); g.arc(x, 18, 1.6, 0, 7); g.fill(); });
    woodPat = ctx.createPattern(wt, 'repeat');
  }

  // -------------------------------------------------------- decor --
  const decor = [];
  [330, 640, 980, 1290, 2330, 2650, 2980, 3260].forEach((x, i) => decor.push({ t: i % 3 === 1 ? 'oak' : 'pine', x: x + rand() * 60, y: GROUND, s: 0.8 + rand() * 0.5 }));
  [520, 1520, 2090, 3120].forEach((x) => decor.push({ t: 'rock', x, y: GROUND, s: 0.7 + rand() * 0.6 }));
  [1040, 2550].forEach((x) => decor.push({ t: 'fence', x, y: GROUND, w: 180 }));
  decor.push({ t: 'sign', x: 900, y: GROUND, txt: 'DANGER\nMINES' });
  decor.push({ t: 'sign', x: 2740, y: GROUND, txt: 'OUTPOST\n 02 →' });
  decor.push({ t: 'flag', x: 110, y: 1150, c: '#b5302a' });
  decor.push({ t: 'flag', x: 3490, y: 1150, c: '#2f5d9a' });
  decor.push({ t: 'antenna', x: 1940, y: 1460 });
  decor.push({ t: 'bags', x: 1420, y: GROUND, n: 5 });
  decor.push({ t: 'bags', x: 2120, y: GROUND, n: 5 });
  const grassFront = Array.from({ length: 90 }, () => ({ x: rand() * M.W, h: 10 + rand() * 16, p: rand() * 6 }));

  // floating dust / pollen / leaves
  const motes = Array.from({ length: 50 }, () => ({ x: rand() * M.W, y: rand() * GROUND, v: 8 + rand() * 20, p: rand() * 6, leaf: rand() < 0.4 }));

  // ---------------------------------------------------- background --
  function drawBackground(ctx, cam, t, sw, sh) {
    if (!layers) { layers = buildLayers(); clouds = buildClouds(); buildMaterials(ctx); }
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, sh);
    g.addColorStop(0, '#3f7fc8'); g.addColorStop(0.45, '#7fb3e0'); g.addColorStop(0.8, '#cfe2ee'); g.addColorStop(1, '#efe6cf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, sw, sh);
    // sun + glow
    const camCY = cam.y + cam.h / 2;
    const sx = sw * 0.8 - (cam.x / Math.max(1, M.W - cam.w)) * sw * 0.08, sy = sh * 0.16 + (camCY - 1300) * 0.02 * cam.s;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(sw, sh) * 0.55);
    sg.addColorStop(0, 'rgba(255,248,220,0.95)'); sg.addColorStop(0.06, 'rgba(255,240,200,0.75)');
    sg.addColorStop(0.25, 'rgba(255,230,180,0.18)'); sg.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, sw, sh);
    ctx.fillStyle = '#fffdf3'; ctx.beginPath(); ctx.arc(sx, sy, Math.min(sw, sh) * 0.035, 0, 7); ctx.fill();

    // clouds (screen space with gentle parallax + drift)
    const span = sw + 900;
    for (const c of clouds) {
      const x = (((c.x + t * c.v - cam.x * c.f * cam.s * 3) % span) + span) % span - 450;
      const y = c.y * (sh / 900) - (camCY - 1300) * c.f * cam.s;
      const s = cam.s * 1.4;
      ctx.globalAlpha = c.a;
      ctx.drawImage(c.img, x, y, c.img.width * s, c.img.height * s);
    }
    ctx.globalAlpha = 1;
    // birds
    ctx.strokeStyle = 'rgba(40,45,55,0.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (const b of birds) {
      const x = (((b.x + t * b.v) % (sw + 400)) + sw + 400) % (sw + 400) - 200, y = b.y * (sh / 900) + Math.sin(t * 0.8 + b.p) * 8;
      const flap = Math.sin(t * 8 + b.p) * 4 * b.s, w = 7 * b.s;
      ctx.beginPath(); ctx.moveTo(x - w, y - flap); ctx.quadraticCurveTo(x - w * 0.4, y - 2, x, y); ctx.quadraticCurveTo(x + w * 0.4, y - 2, x + w, y - flap); ctx.stroke();
    }

    // parallax terrain layers
    for (const L of layers) {
      const lx = -cam.x * L.f;
      const top = GROUND - L.h + SINK + (camCY - 1300) * (1 - L.f) * 0.35;
      const sy0 = (top - cam.y) * cam.s;
      ctx.drawImage(L.c, 0, 0, L.c.width, L.h, lx * cam.s, sy0, L.c.width * cam.s, L.h * cam.s);
      const bottom = sy0 + L.h * cam.s;
      if (bottom < sh) { ctx.fillStyle = L.base; ctx.fillRect(0, bottom - 1, sw, sh - bottom + 1); }
      // atmospheric haze between layers
      const hz = ctx.createLinearGradient(0, sy0 + L.h * cam.s * 0.4, 0, bottom);
      hz.addColorStop(0, 'rgba(220,232,240,0)'); hz.addColorStop(1, `rgba(220,232,240,${0.28 - L.f * 0.35})`);
      ctx.fillStyle = hz; ctx.fillRect(0, sy0, sw, Math.max(0, bottom - sy0));
    }
  }

  // ---------------------------------------------------- props --
  function drawPine(ctx, x, y, s, t) {
    const sw = Math.sin(t * 0.9 + x) * 2;
    ctx.fillStyle = '#4a3322'; ctx.fillRect(x - 6 * s, y - 60 * s, 12 * s, 60 * s);
    const tiers = 5;
    for (let k = 0; k < tiers; k++) {
      const ty = y - 40 * s - k * 38 * s, tw = (70 - k * 11) * s;
      ctx.fillStyle = k % 2 ? '#2f5a2a' : '#356630';
      ctx.beginPath(); ctx.moveTo(x - tw + sw * k * 0.3, ty); ctx.lineTo(x + sw * k * 0.5, ty - 62 * s); ctx.lineTo(x + tw + sw * k * 0.3, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,200,0.12)';
      ctx.beginPath(); ctx.moveTo(x + sw * k * 0.5, ty - 62 * s); ctx.lineTo(x + tw + sw * k * 0.3, ty); ctx.lineTo(x + tw * 0.3, ty); ctx.closePath(); ctx.fill();
    }
  }
  function drawOak(ctx, x, y, s, t) {
    ctx.fillStyle = '#5a3d27';
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y); ctx.lineTo(x - 6 * s, y - 120 * s); ctx.lineTo(x + 6 * s, y - 120 * s); ctx.lineTo(x + 12 * s, y); ctx.fill();
    ctx.strokeStyle = '#5a3d27'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.moveTo(x, y - 90 * s); ctx.lineTo(x - 40 * s, y - 140 * s); ctx.moveTo(x, y - 100 * s); ctx.lineTo(x + 38 * s, y - 150 * s); ctx.stroke();
    const sw = Math.sin(t * 0.7 + x) * 3;
    const blobs = [[-50, -150, 48], [40, -160, 52], [0, -195, 58], [-20, -140, 40], [55, -125, 34], [-60, -120, 30]];
    for (const [bx, by, r] of blobs) {
      ctx.fillStyle = '#3f6e2f'; ctx.beginPath(); ctx.arc(x + bx * s + sw, y + by * s, r * s, 0, 7); ctx.fill();
    }
    for (const [bx, by, r] of blobs) {
      ctx.fillStyle = 'rgba(160,210,100,0.22)'; ctx.beginPath(); ctx.arc(x + bx * s + sw + r * s * 0.25, y + by * s - r * s * 0.3, r * s * 0.55, 0, 7); ctx.fill();
    }
  }
  function drawRock(ctx, x, y, s) {
    ctx.fillStyle = '#7d7a72';
    ctx.beginPath(); ctx.moveTo(x - 50 * s, y); ctx.lineTo(x - 38 * s, y - 34 * s); ctx.lineTo(x - 6 * s, y - 50 * s); ctx.lineTo(x + 30 * s, y - 38 * s); ctx.lineTo(x + 52 * s, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 34 * s); ctx.lineTo(x - 6 * s, y - 50 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.moveTo(x + 30 * s, y - 38 * s); ctx.lineTo(x + 52 * s, y); ctx.lineTo(x + 8 * s, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5f8f3a'; ctx.beginPath(); ctx.ellipse(x - 10 * s, y - 46 * s, 14 * s, 5 * s, -0.3, 0, 7); ctx.fill();
  }
  function sandbag(ctx, x, y, w, h) {
    ctx.fillStyle = '#b39d6e'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 4, y + 2, w - 8, 2);
    ctx.strokeStyle = 'rgba(70,55,30,0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + 2); ctx.lineTo(x + w * 0.5, y + h - 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 3, y + h - 3, w - 6, 3);
  }
  function sandbagRow(ctx, x, y, n) {
    for (let r = 0; r < 2; r++) for (let i = 0; i < n - r; i++) sandbag(ctx, x + i * 32 + r * 16, y - 14 - r * 12, 34, 15);
  }
  function drawFence(ctx, x, y, w) {
    ctx.fillStyle = '#6b5236';
    for (let px = x; px <= x + w; px += 60) ctx.fillRect(px - 3, y - 52, 6, 52);
    ctx.strokeStyle = '#5c5c5c'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let px = x; px <= x + w; px += 6) ctx.lineTo(px, y - 16 - k * 14 + Math.sin(px * 0.5) * 2);
      ctx.stroke();
      for (let px = x + 8; px < x + w; px += 16) { ctx.beginPath(); ctx.moveTo(px - 3, y - 19 - k * 14); ctx.lineTo(px + 3, y - 13 - k * 14); ctx.moveTo(px + 3, y - 19 - k * 14); ctx.lineTo(px - 3, y - 13 - k * 14); ctx.stroke(); }
    }
  }
  function drawSign(ctx, x, y, txt) {
    ctx.fillStyle = '#5a4128'; ctx.fillRect(x - 3, y - 80, 6, 80);
    ctx.save(); ctx.translate(x, y - 78); ctx.rotate(-0.05);
    ctx.fillStyle = '#8c6a43'; ctx.fillRect(-42, -20, 84, 40);
    ctx.strokeStyle = '#5a4128'; ctx.lineWidth = 3; ctx.strokeRect(-42, -20, 84, 40);
    ctx.fillStyle = txt.startsWith('DANGER') ? '#b5302a' : '#f1e6c8';
    ctx.font = '13px "Black Ops One", Impact, sans-serif'; ctx.textAlign = 'center';
    txt.split('\n').forEach((l, i) => ctx.fillText(l, 0, -3 + i * 15));
    ctx.restore();
  }
  function drawFlag(ctx, x, y, c, t) {
    ctx.fillStyle = '#6d6d6d'; ctx.fillRect(x - 2, y - 120, 4, 120);
    ctx.fillStyle = '#c8c8c8'; ctx.beginPath(); ctx.arc(x, y - 121, 4, 0, 7); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x + 2, y - 116);
    for (let i = 0; i <= 10; i++) ctx.lineTo(x + 2 + i * 6, y - 116 + Math.sin(t * 5 - i * 0.6) * (i * 0.6));
    for (let i = 10; i >= 0; i--) ctx.lineTo(x + 2 + i * 6, y - 80 + Math.sin(t * 5 - i * 0.6) * (i * 0.6));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x + 32, y - 98 + Math.sin(t * 5 - 5 * 0.6) * 3, 6, 0, 7); ctx.fill();
  }
  function drawAntenna(ctx, x, y, t) {
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 110); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x, y - 60); ctx.lineTo(x + 14, y); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#e53b2f' : '#6b1e18'; ctx.beginPath(); ctx.arc(x, y - 112, 3.5, 0, 7); ctx.fill();
  }

  function drawTower(ctx, s) {
    ctx.fillStyle = concretePat; ctx.fillRect(s.x, s.y, s.w, s.h);
    const sh = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
    sh.addColorStop(0, 'rgba(255,255,240,0.12)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = sh; ctx.fillRect(s.x, s.y, s.w, s.h);
    // stains + firing slits
    ctx.fillStyle = 'rgba(60,50,30,0.18)';
    for (let x = s.x + 20; x < s.x + s.w; x += 46) ctx.fillRect(x, s.y + 24, 6, s.h * 0.35);
    ctx.fillStyle = '#26261f';
    for (let y = s.y + 90; y < s.y + s.h - 60; y += 130) ctx.fillRect(s.x + s.w * 0.2, y, s.w * 0.6, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(s.x, s.y, s.w, 8);
    // sandbags along the top edge
    for (let x = s.x + 2; x < s.x + s.w - 30; x += 32) sandbag(ctx, x, s.y + 2, 34, 15);
  }
  function drawBunker(ctx, s) {
    ctx.fillStyle = concretePat; ctx.fillRect(s.x, s.y, s.w, s.h);
    // camo paint blotches
    const cols = ['rgba(85,100,50,0.45)', 'rgba(120,95,60,0.4)', 'rgba(40,45,30,0.35)'];
    let r = 77; const rr = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
    for (let i = 0; i < 26; i++) { ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.ellipse(s.x + rr() * s.w, s.y + rr() * s.h, 20 + rr() * 40, 10 + rr() * 20, rr() * 3, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#1f1f1a'; ctx.fillRect(s.x + 60, s.y + 70, s.w - 120, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(s.x, s.y + s.h - 12, s.w, 12);
    ctx.fillStyle = '#e8d9a8'; ctx.font = '22px "Black Ops One", Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.globalAlpha = 0.75; ctx.fillText('BUNKER  B-7', s.x + s.w / 2, s.y + 140); ctx.globalAlpha = 1;
    for (let x = s.x + 4; x < s.x + s.w - 30; x += 32) sandbag(ctx, x, s.y + 2, 34, 15);
  }
  function drawCrate(ctx, s, i) {
    const ammo = i % 2 === 0;
    ctx.fillStyle = ammo ? '#55602f' : '#8a6539'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = ammo ? '#3a4220' : '#5e4122'; ctx.lineWidth = 5; ctx.strokeRect(s.x + 2.5, s.y + 2.5, s.w - 5, s.h - 5);
    if (ammo) {
      ctx.fillStyle = '#d9cc95'; ctx.font = '13px "Black Ops One", Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('AMMO', s.x + s.w / 2, s.y + s.h / 2 + 2); ctx.font = '9px sans-serif'; ctx.fillText('7.62 MM', s.x + s.w / 2, s.y + s.h / 2 + 14);
    } else {
      ctx.strokeStyle = '#5e4122'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(s.x + 5, s.y + 5); ctx.lineTo(s.x + s.w - 5, s.y + s.h - 5); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,35,15,0.35)'; ctx.lineWidth = 1;
      for (let y = s.y + 14; y < s.y + s.h - 6; y += 12) { ctx.beginPath(); ctx.moveTo(s.x + 6, y); ctx.lineTo(s.x + s.w - 6, y); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(s.x, s.y, s.w, 3);
    ctx.fillStyle = '#3a3a3a'; [[6, 6], [s.w - 9, 6], [6, s.h - 9], [s.w - 9, s.h - 9]].forEach(([a, b]) => ctx.fillRect(s.x + a, s.y + b, 3, 3));
  }
  function drawJeep(ctx, s) {
    const x = s.x, y = s.y, w = s.w, h = s.h;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w * 0.55, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4f5a2c';
    ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.lineTo(x + w * 0.62, y + 22); ctx.lineTo(x + w * 0.72, y + 16); ctx.lineTo(x + w, y + 20);
    ctx.lineTo(x + w, y + h - 14); ctx.lineTo(x, y + h - 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 2, y + 23, w - 4, 3);
    // windshield frame + roll bar
    ctx.strokeStyle = '#3a4220'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + 22); ctx.lineTo(x + w * 0.52, y); ctx.moveTo(x + 18, y + 22); ctx.lineTo(x + 22, y + 2); ctx.lineTo(x + w * 0.4, y + 2); ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,230,0.45)'; ctx.beginPath(); ctx.moveTo(x + w * 0.58, y + 20); ctx.lineTo(x + w * 0.52, y + 3); ctx.lineTo(x + w * 0.5, y + 20); ctx.fill();
    ctx.fillStyle = '#ece3c0'; ctx.font = '10px "Black Ops One", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', x + w * 0.35, y + 38);
    ctx.fillStyle = '#f5e7a0'; ctx.fillRect(x + w - 6, y + 24, 6, 6);
    ctx.fillStyle = '#9a2a20'; ctx.fillRect(x, y + 26, 4, 6);
    // spare tyre
    ctx.fillStyle = '#1e1e1e'; ctx.beginPath(); ctx.ellipse(x - 2, y + 30, 6, 12, 0, 0, 7); ctx.fill();
    [x + 24, x + w - 24].forEach((wx) => {
      ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(wx, y + h - 12, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#6f7356'; ctx.beginPath(); ctx.arc(wx, y + h - 12, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#4f5a2c'; ctx.beginPath(); ctx.arc(wx, y + h - 14, 17, Math.PI, 0); ctx.lineTo(wx + 17, y + h - 14); ctx.fill();
    });
  }

  function drawPlatform(ctx, p, t) {
    const { x, y, w } = p;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 6, y + 22, w - 12, 6);
    if (p.c === 0) { // wooden scaffold
      // under-truss: two stringers with cross bracing
      ctx.fillStyle = '#5c3f22'; ctx.fillRect(x + 8, y + 22, w - 16, 6); ctx.fillRect(x + 20, y + 36, w - 40, 5);
      ctx.strokeStyle = '#4a321b'; ctx.lineWidth = 4;
      ctx.beginPath(); for (let px = x + 20; px < x + w - 40; px += 40) { ctx.moveTo(px, y + 26); ctx.lineTo(px + 40, y + 38); ctx.moveTo(px + 40, y + 26); ctx.lineTo(px, y + 38); } ctx.stroke();
      ctx.save(); ctx.translate(0, y); ctx.fillStyle = woodPat; ctx.fillRect(x, 0, w, 20); ctx.restore();
      ctx.fillStyle = '#4a321b'; ctx.fillRect(x, y + 17, w, 5);
      ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(x, y, w, 2);
      // rope sag
      ctx.strokeStyle = '#b89f70'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 4, y - 26); ctx.quadraticCurveTo(x + w / 2, y - 6, x + w - 4, y - 26); ctx.stroke();
      ctx.fillStyle = '#5c3f22'; ctx.fillRect(x, y - 30, 7, 30); ctx.fillRect(x + w - 7, y - 30, 7, 30);
    } else if (p.c === 1) { // steel girder
      const gg = ctx.createLinearGradient(0, y, 0, y + 22);
      gg.addColorStop(0, '#9aa1a6'); gg.addColorStop(0.5, '#6b7378'); gg.addColorStop(1, '#4b5256');
      ctx.fillStyle = gg; ctx.fillRect(x, y, w, 7); ctx.fillRect(x, y + 15, w, 7);
      ctx.fillStyle = '#5a6166'; ctx.fillRect(x, y + 7, w, 8);
      ctx.strokeStyle = '#4b5256'; ctx.lineWidth = 3;
      ctx.beginPath(); for (let px = x; px < x + w - 20; px += 24) { ctx.moveTo(px, y + 7); ctx.lineTo(px + 12, y + 15); ctx.lineTo(px + 24, y + 7); } ctx.stroke();
      ctx.fillStyle = '#c9cdd0'; for (let px = x + 8; px < x + w; px += 20) { ctx.beginPath(); ctx.arc(px, y + 3.5, 1.5, 0, 7); ctx.arc(px, y + 18.5, 1.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(150,80,40,0.35)'; ctx.fillRect(x + w * 0.3, y + 15, 24, 7); // rust
      // hazard stripes on ends
      for (const ex of [x, x + w - 18]) {
        ctx.save(); ctx.beginPath(); ctx.rect(ex, y, 18, 7); ctx.clip();
        for (let k = -2; k < 4; k++) { ctx.fillStyle = k % 2 ? '#e2b52c' : '#222'; ctx.beginPath(); ctx.moveTo(ex + k * 7, y + 7); ctx.lineTo(ex + k * 7 + 7, y); ctx.lineTo(ex + k * 7 + 14, y); ctx.lineTo(ex + k * 7 + 7, y + 7); ctx.fill(); }
        ctx.restore();
      }
    } else { // floating rock ledge with grass
      ctx.fillStyle = dirtPat;
      ctx.beginPath(); ctx.moveTo(x, y + 4);
      const n = Math.max(4, Math.floor(w / 40));
      for (let i = 0; i <= n; i++) {
        const px = x + (i / n) * w, d = Math.sin((i / n) * Math.PI);
        ctx.lineTo(px, y + 22 + d * 70 + ((i * 37) % 13));
      }
      ctx.lineTo(x + w, y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + 20); for (let i = 0; i <= n; i++) { const px = x + (i / n) * w, d = Math.sin((i / n) * Math.PI); if (px >= x + w * 0.5) ctx.lineTo(px, y + 22 + d * 70 + ((i * 37) % 13)); } ctx.lineTo(x + w, y + 10); ctx.fill();
      ctx.fillStyle = '#5f9a3a'; ctx.beginPath(); ctx.roundRect(x - 4, y - 2, w + 8, 12, 6); ctx.fill();
      ctx.fillStyle = '#7fb74f'; ctx.fillRect(x, y - 2, w, 4);
      ctx.strokeStyle = '#6aa844'; ctx.lineWidth = 1.5;
      for (let px = x + 3; px < x + w; px += 7) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + Math.sin(t * 2 + px) * 1.5, y - 6 - ((px * 7) % 5)); ctx.stroke(); }
      ctx.strokeStyle = '#4f7d33'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 10); ctx.quadraticCurveTo(x + w * 0.22, y + 40, x + w * 0.18, y + 58); ctx.stroke(); // hanging vine
    }
  }

  // --------------------------------------------------------- world --
  function drawWorld(ctx, cam, t) {
    const vx0 = cam.x - 200, vx1 = cam.x + cam.w + 200, vy0 = cam.y - 300, vy1 = cam.y + cam.h + 300;
    const vis = (x, y, w, h) => x + w > vx0 && x < vx1 && y + h > vy0 && y < vy1;

    for (const d of decor) {
      if (!vis(d.x - 160, d.y - 330, 320, 340)) continue;
      if (d.t === 'pine') drawPine(ctx, d.x, d.y, d.s, t);
      else if (d.t === 'oak') drawOak(ctx, d.x, d.y, d.s, t);
      else if (d.t === 'rock') drawRock(ctx, d.x, d.y, d.s);
      else if (d.t === 'fence') drawFence(ctx, d.x, d.y, d.w);
      else if (d.t === 'sign') drawSign(ctx, d.x, d.y, d.txt);
      else if (d.t === 'flag') drawFlag(ctx, d.x, d.y, d.c, t);
      else if (d.t === 'antenna') drawAntenna(ctx, d.x, d.y, t);
      else if (d.t === 'bags') sandbagRow(ctx, d.x, d.y, d.n);
    }

    let ci = 0;
    for (const s of M.solids) {
      if (s.kind === 'crate') ci++;
      if (!vis(s.x, s.y - 20, s.w, s.h + 20) || s.kind === 'wall') continue;
      if (s.kind === 'ground') {
        const x0 = Math.max(s.x, vx0), x1 = Math.min(s.x + s.w, vx1);
        ctx.save(); ctx.translate(0, s.y - 12); ctx.fillStyle = groundPat; ctx.fillRect(x0, 0, x1 - x0, 330); ctx.restore();
        ctx.fillStyle = '#2e2116'; ctx.fillRect(x0, s.y + 318, x1 - x0, s.h);
      } else if (s.kind === 'crate') drawCrate(ctx, s, ci);
      else if (s.kind === 'car') drawJeep(ctx, s);
      else if (s.kind === 'bunker') drawBunker(ctx, s);
      else drawTower(ctx, s);
    }

    for (const p of M.platforms) if (vis(p.x, p.y - 40, p.w, 140)) drawPlatform(ctx, p, t);

    // drifting pollen + leaves
    for (const m of motes) {
      const y = ((m.y + t * m.v) % GROUND + GROUND) % GROUND;
      const x = m.x + Math.sin(t * 0.8 + m.p) * 30 + t * 6;
      const xx = ((x % M.W) + M.W) % M.W;
      if (!vis(xx, y, 6, 6)) continue;
      if (m.leaf) {
        ctx.save(); ctx.translate(xx, y); ctx.rotate(t * 2 + m.p);
        ctx.fillStyle = 'rgba(150,120,50,0.8)'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore();
      } else { ctx.globalAlpha = 0.45; ctx.fillStyle = '#fffbe8'; ctx.fillRect(xx, y, 2, 2); ctx.globalAlpha = 1; }
    }
  }

  // grass tufts drawn in front of fighters for depth
  function drawForeground(ctx, cam, t) {
    ctx.strokeStyle = '#6aa844'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const g of grassFront) {
      if (g.x < cam.x - 40 || g.x > cam.x + cam.w + 40) continue;
      const sw = Math.sin(t * 1.6 + g.p) * 3;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) { ctx.moveTo(g.x + k * 3, GROUND + 4); ctx.quadraticCurveTo(g.x + k * 4, GROUND - g.h * 0.5, g.x + k * 5 + sw, GROUND - g.h + Math.abs(k) * 3); }
      ctx.stroke();
    }
  }

  // ----------------------------------------------------- geometry --
  function rayBlocked(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 24);
    for (let i = 1; i < n; i++) {
      const x = x0 + (dx * i) / n, y = y0 + (dy * i) / n;
      for (const s of M.solids) if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return true;
    }
    return false;
  }
  function solidAt(x, y) {
    for (const s of M.solids) if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return s;
    return null;
  }

  return { drawBackground, drawWorld, drawForeground, rayBlocked, solidAt, GROUND };
})();
