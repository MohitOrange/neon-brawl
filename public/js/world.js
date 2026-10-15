// Neon Brawl — the arena: synthwave sky, parallax city, neon platforms and props
const World = (() => {
  const M = NB.MAP;
  const GROUND = 1650;
  const PCOL = ['#00e5ff', '#ff2e88', '#ffe600'];
  let rng = 12345;
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);

  // ------------------------------------------------------------ stars --
  const stars = Array.from({ length: 140 }, () => ({ x: rand(), y: rand() * 0.55, r: rand() * 1.6 + 0.3, p: rand() * 6 }));

  // ------------------------------------------------- parallax layers --
  function makeLayer(f, h, draw) {
    const w = Math.ceil(M.W * f + 2300 * (1 - f));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return { c, f, h };
  }
  let layers = null;
  const buildLayers = () => [
    makeLayer(0.12, 520, (g, w, h) => { // mountains
      for (let k = 0; k < 2; k++) {
        g.beginPath(); g.moveTo(0, h);
        let x = 0;
        while (x < w) {
          const pw = 160 + rand() * 260, ph = (k ? 180 : 300) + rand() * (k ? 120 : 200);
          g.lineTo(x + pw / 2, h - ph); g.lineTo(x + pw, h - (k ? 40 : 80) * rand()); x += pw;
        }
        g.lineTo(w, h); g.closePath();
        const gr = g.createLinearGradient(0, h - 500, 0, h);
        gr.addColorStop(0, k ? '#5b1a7a' : '#3a0f63'); gr.addColorStop(1, k ? '#1a0538' : '#12042a');
        g.fillStyle = gr; g.fill();
        g.strokeStyle = k ? '#ff2e88aa' : '#b14bff88'; g.lineWidth = 2; g.stroke();
      }
    }),
    makeLayer(0.32, 700, (g, w, h) => { // far skyline
      let x = 0;
      while (x < w) {
        const bw = 60 + rand() * 120, bh = 160 + rand() * 420;
        g.fillStyle = '#170a3a'; g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = '#ffffff';
        for (let wy = h - bh + 14; wy < h - 10; wy += 18) for (let wx = x + 8; wx < x + bw - 8; wx += 14)
          if (rand() < 0.22) { g.globalAlpha = 0.25 + rand() * 0.4; g.fillStyle = rand() < 0.5 ? '#ffd27a' : '#7ae8ff'; g.fillRect(wx, wy, 6, 8); }
        g.globalAlpha = 1;
        if (rand() < 0.3) { g.fillStyle = '#ff2e88'; g.fillRect(x + bw / 2 - 1, h - bh - 30, 2, 30); }
        x += bw + rand() * 14;
      }
    }),
    makeLayer(0.58, 820, (g, w, h) => { // near skyline with neon trims
      let x = 0;
      const signs = ['BAR', 'HOTEL', 'ZAP', 'ラーメン', 'ARCADE', 'NEO', '24H', 'PIZZA', 'GYM', 'CLUB'];
      while (x < w) {
        const bw = 110 + rand() * 170, bh = 260 + rand() * 480;
        const gr = g.createLinearGradient(0, h - bh, 0, h);
        gr.addColorStop(0, '#2a1060'); gr.addColorStop(1, '#0e0426');
        g.fillStyle = gr; g.fillRect(x, h - bh, bw, bh);
        const trim = PCOL[Math.floor(rand() * 3)];
        g.fillStyle = trim; g.globalAlpha = 0.9; g.fillRect(x, h - bh, bw, 3); g.globalAlpha = 1;
        for (let wy = h - bh + 20; wy < h - 20; wy += 26) for (let wx = x + 12; wx < x + bw - 14; wx += 22)
          if (rand() < 0.3) { g.globalAlpha = 0.35 + rand() * 0.5; g.fillStyle = rand() < 0.6 ? '#ffcf6b' : '#ff7ad9'; g.fillRect(wx, wy, 10, 13); }
        g.globalAlpha = 1;
        if (rand() < 0.55) {
          const s = signs[Math.floor(rand() * signs.length)], col = PCOL[Math.floor(rand() * 3)];
          g.font = 'bold 26px Bungee, sans-serif'; g.textAlign = 'center';
          g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = col;
          g.fillText(s, x + bw / 2, h - bh + 60 + rand() * 80); g.shadowBlur = 0;
        }
        x += bw + 8 + rand() * 30;
      }
    })
  ];

  // ---------------------------------------------------- static decor --
  const decor = [];
  [380, 1000, 1480, 2120, 2620, 3220, 2000 + 600].forEach((x, i) => decor.push({ t: i % 2 ? 'lamp' : 'palm', x, y: GROUND }));
  [560, 3050].forEach((x) => decor.push({ t: 'palm', x, y: GROUND }));
  decor.push({ t: 'sign', x: 110, y: 1220, txt: 'BRAWL', c: '#ff2e88' });
  decor.push({ t: 'sign', x: 3490, y: 1220, txt: 'ZAP!', c: '#00e5ff' });
  decor.push({ t: 'holo', x: 1800, y: 1530 });
  const towerWins = [];
  for (const s of M.solids) if (s.kind === 'tower' || s.kind === 'bunker')
    for (let y = s.y + 40; y < s.y + s.h - 20; y += 34) for (let x = s.x + 22; x < s.x + s.w - 30; x += 36)
      if (rand() < 0.6) towerWins.push({ x, y, c: rand() < 0.5 ? '#ffcf6b' : '#7ae8ff', p: rand() * 10 });

  // floating ambient particles
  const motes = Array.from({ length: 60 }, () => ({ x: rand() * M.W, y: rand() * GROUND, v: 10 + rand() * 25, p: rand() * 6, c: PCOL[Math.floor(rand() * 3)] }));

  // ------------------------------------------------------------ draw --
  function drawBackground(ctx, cam, t, sw, sh) {
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, sh);
    g.addColorStop(0, '#0b0120'); g.addColorStop(0.45, '#2a0b52'); g.addColorStop(0.75, '#7a1d74'); g.addColorStop(1, '#ff4f8b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, sw, sh);
    // stars
    for (const s of stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p));
      ctx.fillStyle = '#fff';
      ctx.fillRect(((s.x * sw * 1.2 - cam.x * 0.02 * cam.s) % (sw * 1.2) + sw * 1.2) % (sw * 1.2), s.y * sh, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // sun
    const sunR = Math.min(sw, sh) * 0.28;
    const sx = sw / 2 - (cam.x + cam.w / 2 - M.W / 2) * 0.05 * cam.s;
    const sy = sh * 0.62 - (cam.y + cam.h / 2 - 1300) * 0.08 * cam.s;
    ctx.save();
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 60;
    const sg = ctx.createLinearGradient(0, sy - sunR, 0, sy + sunR);
    sg.addColorStop(0, '#ffe600'); sg.addColorStop(0.5, '#ff7b00'); sg.addColorStop(1, '#ff2e88');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#5a1660';
    for (let i = 0; i < 7; i++) { // stripes
      const yy = sy + sunR * (0.1 + i * 0.13) + ((t * 8) % (sunR * 0.13));
      ctx.fillRect(sx - sunR, yy, sunR * 2, 2 + i * 1.6);
    }
    ctx.restore();
    // parallax layers
    if (!layers) layers = buildLayers();
    for (const L of layers) {
      const lx = -cam.x * L.f;
      const top = GROUND - L.h + (cam.y + cam.h / 2 - 1300) * (1 - L.f) * 0.35;
      ctx.drawImage(L.c, 0, 0, L.c.width, L.h, lx * cam.s, (top - cam.y) * cam.s, L.c.width * cam.s, L.h * cam.s);
    }
    // haze
    const hz = ctx.createLinearGradient(0, sh * 0.5, 0, sh);
    hz.addColorStop(0, 'rgba(255,46,136,0)'); hz.addColorStop(1, 'rgba(255,46,136,0.18)');
    ctx.fillStyle = hz; ctx.fillRect(0, sh * 0.5, sw, sh * 0.5);
  }

  function drawPalm(ctx, x, y, t) {
    const sway = Math.sin(t * 1.2 + x) * 6;
    ctx.strokeStyle = '#1b0b33'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 110, x + 8 + sway, y - 210); ctx.stroke();
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.stroke();
    const tx = x + 8 + sway, ty = y - 210;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI + Math.sin(t + i) * 0.05;
      ctx.strokeStyle = '#140829'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * 60, ty + Math.sin(a) * 40 - 20, tx + Math.cos(a) * 95, ty + Math.sin(a) * 45 + 30);
      ctx.stroke(); ctx.strokeStyle = '#7cff4f88'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  function drawLamp(ctx, x, y, t) {
    ctx.fillStyle = '#1b0b33'; ctx.fillRect(x - 4, y - 190, 8, 190);
    ctx.fillRect(x - 4, y - 190, 40, 6);
    const lg = ctx.createRadialGradient(x + 32, y - 180, 2, x + 32, y - 100, 170);
    lg.addColorStop(0, 'rgba(255,230,0,0.35)'); lg.addColorStop(1, 'rgba(255,230,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x + 22, y - 184); ctx.lineTo(x + 42, y - 184); ctx.lineTo(x + 110, y); ctx.lineTo(x - 46, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 16;
    ctx.fillRect(x + 22, y - 186, 20, 6); ctx.shadowBlur = 0;
  }

  function drawWorld(ctx, cam, t) {
    const vx0 = cam.x - 200, vx1 = cam.x + cam.w + 200, vy0 = cam.y - 300, vy1 = cam.y + cam.h + 300;
    const vis = (x, y, w, h) => x + w > vx0 && x < vx1 && y + h > vy0 && y < vy1;

    // decor behind
    for (const d of decor) {
      if (!vis(d.x - 150, d.y - 300, 300, 320)) continue;
      if (d.t === 'palm') drawPalm(ctx, d.x, d.y, t);
      else if (d.t === 'lamp') drawLamp(ctx, d.x, d.y, t);
    }

    // solids
    for (const s of M.solids) {
      if (!vis(s.x, s.y, s.w, s.h) || s.kind === 'wall') continue;
      if (s.kind === 'ground') {
        const g = ctx.createLinearGradient(0, s.y, 0, s.y + 160);
        g.addColorStop(0, '#2b0f55'); g.addColorStop(1, '#0a0218');
        ctx.fillStyle = g; ctx.fillRect(Math.max(s.x, vx0), s.y, Math.min(s.w, vx1 - vx0), s.h);
        // neon grid floor
        ctx.strokeStyle = 'rgba(255,46,136,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath();
        const start = Math.floor(vx0 / 80) * 80;
        for (let x = start; x < vx1; x += 80) { ctx.moveTo(x, s.y); ctx.lineTo(x + (x - (cam.x + cam.w / 2)) * 0.25, s.y + 150); }
        for (let k = 1; k < 5; k++) { const yy = s.y + k * k * 9; ctx.moveTo(vx0, yy); ctx.lineTo(vx1, yy); }
        ctx.stroke();
        ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
        ctx.fillRect(Math.max(s.x, vx0), s.y - 2, Math.min(s.w, vx1 - vx0), 4); ctx.shadowBlur = 0;
      } else if (s.kind === 'crate') {
        ctx.fillStyle = '#3d1a6e'; ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
        ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 3; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
        ctx.beginPath(); ctx.moveTo(s.x + 4, s.y + 4); ctx.lineTo(s.x + s.w - 4, s.y + s.h - 4);
        ctx.moveTo(s.x + s.w - 4, s.y + 4); ctx.lineTo(s.x + 4, s.y + s.h - 4); ctx.stroke();
      } else if (s.kind === 'car') {
        ctx.fillStyle = '#1b0b33';
        ctx.beginPath(); ctx.roundRect(s.x, s.y + 18, s.w, s.h - 26, 10); ctx.fill();
        ctx.beginPath(); ctx.roundRect(s.x + 20, s.y, s.w - 50, 26, 8); ctx.fill();
        ctx.fillStyle = '#00e5ff55'; ctx.fillRect(s.x + 28, s.y + 5, s.w - 66, 14);
        ctx.fillStyle = '#ff2e88'; ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 12;
        ctx.fillRect(s.x + s.w - 8, s.y + 26, 8, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y + 26, 8, 6); ctx.shadowBlur = 0;
        ctx.fillStyle = '#000'; [s.x + 24, s.x + s.w - 24].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, s.y + s.h - 6, 12, 0, 7); ctx.fill(); });
        ctx.strokeStyle = '#b14bff'; ctx.lineWidth = 3; [s.x + 24, s.x + s.w - 24].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, s.y + s.h - 6, 7, 0, 7); ctx.stroke(); });
      } else { // tower / bunker
        const g = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
        g.addColorStop(0, '#24104d'); g.addColorStop(1, '#170838');
        ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
        const col = s.kind === 'bunker' ? '#ff2e88' : '#b14bff';
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 14;
        ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3); ctx.shadowBlur = 0;
      }
    }
    for (const w of towerWins) {
      if (!vis(w.x, w.y, 14, 18)) continue;
      ctx.globalAlpha = 0.45 + 0.4 * Math.max(0, Math.sin(t * 0.7 + w.p));
      ctx.fillStyle = w.c; ctx.fillRect(w.x, w.y, 14, 18);
    }
    ctx.globalAlpha = 1;

    // signs + hologram
    for (const d of decor) {
      if (d.t === 'sign' && vis(d.x - 100, d.y - 60, 200, 100)) {
        const on = Math.sin(t * 9 + d.x) > -0.92;
        ctx.font = '44px Bungee, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = on ? d.c : '#442255'; ctx.shadowColor = d.c; ctx.shadowBlur = on ? 26 : 0;
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(-Math.PI / 2); ctx.fillText(d.txt, -60, 14); ctx.restore();
        ctx.shadowBlur = 0;
      } else if (d.t === 'holo' && vis(d.x - 200, d.y - 100, 400, 200)) {
        ctx.save(); ctx.globalAlpha = 0.75 + Math.sin(t * 20) * 0.05;
        ctx.font = '30px Bungee, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
        ctx.fillText('NEON BRAWL', d.x, d.y + Math.sin(t * 2) * 3);
        ctx.font = '16px Rajdhani, sans-serif'; ctx.fillStyle = '#ff7ad9';
        ctx.fillText('★ ARENA 01 · DOWNTOWN ★', d.x, d.y + 30);
        ctx.restore();
      }
    }

    // one-way platforms (floating hover pads)
    for (const p of M.platforms) {
      if (!vis(p.x, p.y - 10, p.w, 60)) continue;
      const col = PCOL[p.c];
      // hover glow underneath
      const hg = ctx.createLinearGradient(0, p.y + 18, 0, p.y + 70);
      hg.addColorStop(0, col + '55'); hg.addColorStop(1, col + '00');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(p.x + 20, p.y + 18); ctx.lineTo(p.x + p.w - 20, p.y + 18);
      ctx.lineTo(p.x + p.w - 50, p.y + 60 + Math.sin(t * 3 + p.x) * 6); ctx.lineTo(p.x + 50, p.y + 60 + Math.sin(t * 3 + p.x) * 6); ctx.fill();
      ctx.fillStyle = '#1d0b40';
      ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, 20, 8); ctx.fill();
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.fillRect(p.x + 4, p.y, p.w - 8, 4); ctx.shadowBlur = 0;
      ctx.fillStyle = col + '88';
      for (let x = p.x + 18; x < p.x + p.w - 10; x += 36) ctx.fillRect(x, p.y + 11, 14, 3);
    }

    // ambient motes
    for (const m of motes) {
      const y = ((m.y - t * m.v) % GROUND + GROUND) % GROUND;
      if (!vis(m.x, y, 4, 4)) continue;
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + m.p));
      ctx.fillStyle = m.c; ctx.fillRect(m.x + Math.sin(t + m.p) * 20, y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------ geometry --
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

  return { drawBackground, drawWorld, rayBlocked, solidAt, GROUND, PCOL };
})();
