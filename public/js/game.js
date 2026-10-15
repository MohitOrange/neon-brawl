// Neon Brawl — game simulation, bots, effects, rendering, input and HUD
const Game = (() => {
  const M = NB.MAP;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------- tuning --
  const GRAV = 2300, WALK = 270, RUN = 440, JUMP = 860, DJUMP = 760, JET = 3500, JETMAX = 560;
  const FUEL_USE = 45, HW = 15, H = 74, HC = 58;
  const EMOTES = ['😂', '😎', '🔥', '👋', '💀', '🤡'];
  const DIFF = {
    easy:   { err: 0.3, react: 0.9, range: 800, think: 0.5, burst: 0.5 },
    normal: { err: 0.15, react: 0.5, range: 1050, think: 0.32, burst: 0.75 },
    hard:   { err: 0.06, react: 0.22, range: 1450, think: 0.18, burst: 1.3 }
  };

  // ----------------------------------------------------------- state --
  let SW = 0, SH = 0, dpr = 1;
  let running = false, paused = false, myId = null, hostId = null, settings = {}, endsAt = 0;
  let ents = new Map(), bullets = [], parts = [], texts = [], bubbles = [];
  let pickAvail = [], pickPending = [];
  let t = 0, last = 0, sendT = 0, hudT = 0, shake = 0;
  const cam = { x: 0, y: 900, w: 1600, h: 900, s: 1 };
  let deathMsgT = 0, killedBy = '', killerId = null, multi = { n: 0, t: 0 }, streak = 0;
  let onLeave = null;

  // ----------------------------------------------------------- input --
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('touch');
  const keys = {};
  const inp = { mx: 0, run: false, jump: false, jumpPressed: false, jet: false, down: false, fire: false,
    aim: 0, reloadPressed: false, swapPressed: false };
  const mouse = { x: 0, y: 0, l: false, r: false, in: false };
  const touch = { l: null, r: null, lx: 0, ly: 0, rx: 0, ry: 0, aim: 0, fire: false, jump: false, jet: false, lUp: false };

  addEventListener('keydown', (e) => {
    if (!running) return;
    const chat = $('chatInput');
    if (document.activeElement === chat) {
      if (e.key === 'Enter') { const m = chat.value.trim(); if (m) Net.emit('chat', { m }); chat.value = ''; chat.blur(); chat.style.display = 'none'; }
      if (e.key === 'Escape') { chat.blur(); chat.style.display = 'none'; }
      return;
    }
    const k = e.code;
    if (!keys[k]) {
      if (k === 'KeyW' || k === 'Space' || k === 'ArrowUp') inp.jumpPressed = true;
      if (k === 'KeyR') inp.reloadPressed = true;
      if (k === 'KeyQ') inp.swapPressed = true;
      if (k === 'KeyT' || k === 'Enter') { chat.style.display = 'block'; setTimeout(() => chat.focus(), 0); e.preventDefault(); }
      if (k === 'Escape') togglePause();
      if (/^Digit[1-6]$/.test(k)) Net.emit('emote', { e: EMOTES[+k.slice(5) - 1] });
    }
    keys[k] = true;
    if (k === 'Tab') { $('board').classList.add('show'); renderBoard(); e.preventDefault(); }
    if (k === 'Space' || k.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Tab') $('board').classList.remove('show'); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
  cv.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; });
  cv.addEventListener('mousedown', (e) => { SFX.init(); if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { if (running) inp.swapPressed = true; e.preventDefault(); }, { passive: false });

  // touch sticks
  function bindStick(el, side) {
    const knob = el.querySelector('.knob');
    const R = () => el.clientWidth * 0.42;
    const upd = (tch) => {
      const r = el.getBoundingClientRect();
      let dx = tch.clientX - (r.left + r.width / 2), dy = tch.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy), m = R();
      if (d > m) { dx *= m / d; dy *= m / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      touch[side + 'x'] = dx / m; touch[side + 'y'] = dy / m;
    };
    el.addEventListener('touchstart', (e) => { SFX.init(); const tc = e.changedTouches[0]; touch[side] = tc.identifier; upd(tc); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', (e) => { for (const tc of e.changedTouches) if (tc.identifier === touch[side]) upd(tc); e.preventDefault(); }, { passive: false });
    const end = (e) => { for (const tc of e.changedTouches) if (tc.identifier === touch[side]) {
      touch[side] = null; touch[side + 'x'] = 0; touch[side + 'y'] = 0; knob.style.transform = ''; } };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }
  bindStick($('stickL'), 'l'); bindStick($('stickR'), 'r');
  document.querySelectorAll('#touch .tb').forEach((b) => {
    const k = b.dataset.b;
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); SFX.init(); b.classList.add('down');
      if (k === 'jump') { inp.jumpPressed = true; touch.jump = true; }
      if (k === 'jet') touch.jet = true;
      if (k === 'reload') inp.reloadPressed = true;
      if (k === 'swap') inp.swapPressed = true;
      if (k === 'emote') Net.emit('emote', { e: EMOTES[Math.floor(Math.random() * EMOTES.length)] });
    }, { passive: false });
    const up = () => { b.classList.remove('down'); if (k === 'jump') touch.jump = false; if (k === 'jet') touch.jet = false; };
    b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
  });

  function readInput(me) {
    const left = keys.KeyA || keys.ArrowLeft, right = keys.KeyD || keys.ArrowRight;
    inp.mx = (right ? 1 : 0) - (left ? 1 : 0);
    inp.run = !!(keys.ShiftLeft || keys.ShiftRight);
    inp.jump = !!(keys.KeyW || keys.Space || keys.ArrowUp || touch.jump);
    inp.jet = !!(keys.KeyF || mouse.r || touch.jet);
    inp.down = !!(keys.KeyS || keys.ArrowDown);
    inp.fire = mouse.l;
    if (mouse.in && me) {
      const wx = cam.x + mouse.x / cam.s, wy = cam.y + mouse.y / cam.s;
      inp.aim = Math.atan2(wy - (me.y - 56), wx - me.x);
    }
    if (isTouch) {
      if (Math.abs(touch.lx) > 0.2) { inp.mx = Math.sign(touch.lx) * Math.min(1, (Math.abs(touch.lx) - 0.2) / 0.5); inp.run = Math.abs(touch.lx) > 0.85; }
      if (touch.ly > 0.65) inp.down = true;
      const up = touch.ly < -0.65;
      if (up && !touch.lUp) inp.jumpPressed = true;
      if (up) inp.jump = true;
      touch.lUp = up;
      const rm = Math.hypot(touch.rx, touch.ry);
      if (rm > 0.2) touch.aim = Math.atan2(touch.ry, touch.rx);
      else if (inp.mx && touch.r === null) touch.aim = inp.mx > 0 ? 0 : Math.PI;
      inp.aim = touch.aim;
      inp.fire = rm > 0.45;
    }
  }

  // ------------------------------------------------------- entities --
  function makeEnt(p) {
    return Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, dir: 1, aim: 0, ground: false, onPlat: false, crouch: false, jet: false,
      jumps: 0, coyote: 0, fuel: 100, walkPh: 0, recoil: 0, hurtT: 0, spawnT: 0, dropT: 0, prevDown: false,
      weapon: 'pistol', slots: [{ w: 'pistol', mag: 12, res: Infinity }], cur: 0, cd: 0, reloadT: 0,
      seen: false, tgt: null, seed: Math.random() * 100, ai: null, emote: null
    }, p, { hp: p.hp == null ? 100 : p.hp });
  }
  function syncRoster(players) {
    const ids = new Set();
    for (const p of players) {
      ids.add(p.id);
      let e = ents.get(p.id);
      if (!e) { e = makeEnt(p); ents.set(p.id, e); }
      else Object.assign(e, { name: p.name, face: p.face, kills: p.kills, deaths: p.deaths });
      e.local = p.id === myId || (p.isBot && myId === hostId);
    }
    for (const id of [...ents.keys()]) if (!ids.has(id)) ents.delete(id);
  }
  function placeAt(e, si) {
    const sp = M.spawns[si % M.spawns.length];
    e.x = sp[0]; e.y = sp[1]; e.vx = e.vy = 0; e.seen = true; e.tgt = null;
  }
  function resetLoadout(e) {
    e.slots = [{ w: 'pistol', mag: 12, res: Infinity }]; e.cur = 0; e.weapon = 'pistol'; e.reloadT = 0; e.cd = 0; e.fuel = 100;
  }
  const me = () => ents.get(myId);

  // -------------------------------------------------------- physics --
  function physics(e, dt) {
    const h = e.crouch ? HC : H;
    const wasGround = e.ground, impact = e.vy;
    e.x += e.vx * dt;
    for (const s of M.solids) {
      if (e.x + HW > s.x && e.x - HW < s.x + s.w && e.y > s.y && e.y - h < s.y + s.h) {
        if (e.vx > 0 || (e.x < s.x + s.w / 2 && e.vx === 0)) e.x = s.x - HW; else e.x = s.x + s.w + HW;
        e.vx = 0;
      }
    }
    const prevY = e.y;
    e.y += e.vy * dt;
    e.ground = false; e.onPlat = false;
    for (const s of M.solids) {
      if (e.x + HW > s.x && e.x - HW < s.x + s.w && e.y > s.y && e.y - h < s.y + s.h) {
        if (e.vy >= 0 && prevY <= s.y + 1) { e.y = s.y; e.vy = 0; e.ground = true; }
        else if (e.vy < 0) { e.y = s.y + s.h + h; e.vy = 0; }
        else { e.y = s.y; e.vy = 0; e.ground = true; }
      }
    }
    if (e.dropT <= 0 && e.vy >= 0) {
      for (const p of M.platforms) {
        if (e.x + HW * 0.6 > p.x && e.x - HW * 0.6 < p.x + p.w && prevY <= p.y + 1 && e.y >= p.y) {
          e.y = p.y; e.vy = 0; e.ground = true; e.onPlat = true;
        }
      }
    }
    if (e.y > M.H + 200) { e.y = 1650; e.vy = 0; } // safety
    if (e.ground && !wasGround && impact > 650) {
      dust(e.x, e.y, 8);
      if (e.id === myId) SFX.land();
    }
  }

  // controls a locally simulated fighter (the player or a host-run bot)
  function control(e, c, dt) {
    e.aim = c.aim;
    e.dir = Math.cos(e.aim) >= 0 ? 1 : -1;
    if (c.down && !e.prevDown && e.onPlat) e.dropT = 0.28;
    e.prevDown = c.down;
    e.dropT -= dt;
    e.crouch = c.down && e.ground && !e.onPlat;
    const tgt = c.mx * (c.run ? RUN : WALK) * (e.crouch ? 0.4 : 1);
    const acc = (e.ground ? 2800 : 1500) * dt;
    e.vx += Math.max(-acc, Math.min(acc, tgt - e.vx));
    e.coyote = e.ground ? 0.1 : e.coyote - dt;
    if (c.jumpPressed) {
      if (e.ground || e.coyote > 0) { e.vy = -JUMP; e.jumps = 1; e.coyote = 0; e.ground = false; dust(e.x, e.y, 5); if (e.id === myId) SFX.jump(); }
      else if (e.jumps < 2) { e.vy = -DJUMP; e.jumps = 2; ring(e.x, e.y - 10, '#00e5ff'); if (e.id === myId) SFX.djump(); }
    }
    if (e.ground) e.jumps = 0;
    if (!c.jump && e.vy < -300 && !e.jet) e.vy += GRAV * 0.9 * dt; // short hop
    e.jet = c.jet && e.fuel > 0 && !e.crouch;
    if (e.jet) {
      e.vy = Math.max(-JETMAX, e.vy - JET * dt);
      e.fuel = Math.max(0, e.fuel - FUEL_USE * dt);
      if (Math.random() < 0.7) parts.push({ x: e.x - e.dir * 18, y: e.y - 36, vx: (Math.random() - 0.5) * 60, vy: 220 + Math.random() * 120,
        life: 0.4, max: 0.4, size: 6, col: Math.random() < 0.5 ? '#00e5ff' : '#ff2e88', g: -200, type: 'glow' });
      if (e.id === myId && Math.random() < 0.25) SFX.jet();
    } else e.fuel = Math.min(100, e.fuel + (e.ground ? 38 : 9) * dt);
    e.vy = Math.min(1500, e.vy + GRAV * dt);
    physics(e, dt);
    weaponTick(e, c, dt);
  }

  // -------------------------------------------------------- weapons --
  function gunTip(e) {
    const W = WEAPONS[e.weapon] || WEAPONS.pistol;
    const sy = e.y - 56 + (e.crouch ? 14 : 0);
    const L = 15 + W.len;
    return { x: e.x + e.dir * 2 + Math.cos(e.aim) * L, y: sy + Math.sin(e.aim) * L };
  }
  function weaponTick(e, c, dt) {
    let slot = e.slots[e.cur];
    e.cd -= dt;
    if (c.swapPressed && e.slots.length > 1) { e.cur = 1 - e.cur; e.cd = 0.2; e.reloadT = 0; slot = e.slots[e.cur]; if (e.id === myId) SFX.click(); }
    const W = WEAPONS[slot.w];
    e.weapon = slot.w;
    if (e.reloadT > 0) {
      e.reloadT -= dt;
      if (e.reloadT <= 0) { const n = Math.min(W.mag - slot.mag, slot.res); slot.mag += n; slot.res -= n; }
    }
    if (slot.mag === 0 && slot.res === 0 && e.cur === 1) { // out of ammo → drop special gun
      e.slots.pop(); e.cur = 0; return;
    }
    if (e.reloadT <= 0 && slot.mag < W.mag && slot.res > 0 && (c.reloadPressed || (slot.mag === 0 && (c.fire || e.cd < -0.3)))) {
      e.reloadT = W.reload; if (e.id === myId) SFX.reload();
    }
    if (c.fire && e.cd <= 0 && e.reloadT <= 0) {
      if (slot.mag > 0) { slot.mag--; fire(e, W, slot.w); }
      else if (e.id === myId) { SFX.empty(); e.cd = 0.25; }
    }
  }
  function fire(e, W, w) {
    e.cd = W.rate; e.recoil = 1; e.spawnT = 0;
    const tip = gunTip(e);
    const angs = [];
    for (let i = 0; i < W.pellets; i++) angs.push(+(e.aim + (Math.random() - 0.5) * 2 * W.spread).toFixed(3));
    spawnShots(e.id, tip.x, tip.y, angs, w, true);
    const pkt = { x: Math.round(tip.x), y: Math.round(tip.y), a: angs, w };
    if (e.isBot) pkt.id = e.id;
    if (Net.mode === 'online') Net.emit('shot', pkt);
    if (e.id === myId) {
      shake = Math.max(shake, W.shake);
      if (W.kick > 100 && !e.ground) { e.vx -= Math.cos(e.aim) * W.kick; e.vy -= Math.sin(e.aim) * W.kick * 0.9; }
    }
  }
  function spawnShots(owner, x, y, angs, w, local) {
    const W = WEAPONS[w] || WEAPONS.pistol;
    for (const a of angs) {
      const sp = W.speed * (W.pellets > 1 ? 0.85 + Math.random() * 0.3 : 1);
      bullets.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w, owner, local, life: W.life || (w === 'rocket' ? 3 : 1.2) });
    }
    // muzzle flash
    parts.push({ x, y, vx: 0, vy: 0, life: 0.06, max: 0.06, size: w === 'shotgun' || w === 'rocket' ? 34 : 22, col: W.col, type: 'flash' });
    for (let i = 0; i < 4; i++) parts.push({ x, y, vx: Math.cos(angs[0] + (Math.random() - 0.5)) * 300, vy: Math.sin(angs[0] + (Math.random() - 0.5)) * 300,
      life: 0.15, max: 0.15, size: 3, col: '#fff', type: 'glow' });
    const o = ents.get(owner);
    if (o) { o.recoil = 1; parts.push({ x: o.x, y: o.y - 50, vx: -o.dir * (80 + Math.random() * 80), vy: -200 - Math.random() * 100, life: 1.2, max: 1.2, size: 3, col: '#ffcf4a', g: 1800, type: 'shell', bounce: true }); }
    const v = soundAt(x, y);
    SFX.shot(w, v.vol, v.pan);
  }
  function soundAt(x, y) {
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    const d = Math.hypot(x - cx, y - cy);
    return { vol: Math.max(0, 1 - d / 1800), pan: Math.max(-1, Math.min(1, (x - cx) / 900)) };
  }

  function hitTest(b, x, y) {
    for (const e of ents.values()) {
      if (!e.alive || !e.seen || e.id === b.owner || e.spawnT > 0) continue;
      const h = e.crouch ? HC : H;
      const big = e.face && e.bigHead;
      const top = e.y - h - (big ? 16 : 0);
      if (x > e.x - HW - 3 && x < e.x + HW + 3 && y > top && y < e.y) return { e, hs: y < top + (big ? 40 : 22) };
    }
    return null;
  }
  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.px = b.x; b.py = b.y;
      if (b.w === 'rocket') {
        b.vy += 120 * dt;
        if (Math.random() < 0.8) parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.6, max: 0.6, size: 10, col: '#ffffff', type: 'smoke' });
      }
      const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 16);
      let dead = b.life <= 0;
      for (let k = 0; k < steps && !dead; k++) {
        b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
        if (World.solidAt(b.x, b.y) || b.x < 0 || b.x > M.W || b.y > M.H) {
          dead = true;
          if (b.w === 'rocket') explode(b.x, b.y, b.owner, b.local);
          else sparks(b.x, b.y, WEAPONS[b.w].col, 6);
          break;
        }
        const h = hitTest(b, b.x, b.y);
        if (h) {
          dead = true;
          if (b.w === 'rocket') { explode(b.x, b.y, b.owner, b.local); break; }
          const W = WEAPONS[b.w];
          sparks(b.x, b.y, h.e.shirt || '#fff', 10);
          if (b.local) Net.emit('hit', { t: h.e.id, dmg: Math.round(W.dmg * (h.hs ? 1.5 : 1)), w: b.w, hs: h.hs, a: b.owner });
        }
      }
      if (dead) bullets.splice(i, 1);
    }
  }
  function explode(x, y, owner, local) {
    const W = WEAPONS.rocket, R = W.splash;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * 7, s = 100 + Math.random() * 600;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, max: 1, size: 4 + Math.random() * 6,
        col: ['#ffe600', '#ff7b00', '#ff2e88', '#fff'][i % 4], g: 500, type: 'glow' });
    }
    for (let i = 0; i < 12; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60, vx: 0, vy: -40, life: 1.2, max: 1.2, size: 26, col: '#fff', type: 'smoke' });
    parts.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: R, col: '#ffe600', type: 'ring' });
    parts.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, size: R * 0.9, col: '#fff', type: 'flash' });
    const v = soundAt(x, y);
    SFX.boom(v.vol);
    shake = Math.max(shake, 14 * v.vol);
    for (const e of ents.values()) {
      if (!e.alive || !e.seen) continue;
      const dx = e.x - x, dy = e.y - 36 - y, d = Math.hypot(dx, dy);
      if (d > R) continue;
      const f = 1 - d / R;
      if (e.local) { e.vx += (dx / (d || 1)) * 900 * f; e.vy += ((dy / (d || 1)) * 900 - 300) * f; }
      if (local && e.spawnT <= 0) Net.emit('hit', { t: e.id, dmg: Math.round(W.dmg * Math.pow(f, 0.6)), w: 'rocket', a: owner });
    }
  }

  // ------------------------------------------------------- particles --
  function sparks(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7, s = 80 + Math.random() * 350;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, size: 3, col, g: 900, type: 'glow' });
    }
  }
  function dust(x, y, n) {
    for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 24, y: y - 2, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 80,
      life: 0.45, max: 0.45, size: 8, col: '#d9c6ff', type: 'smoke' });
  }
  function ring(x, y, col) { parts.push({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 34, col, type: 'ring' }); }
  function confetti(e) {
    const cols = [e.shirt, '#ffe600', '#00e5ff', '#ff2e88', '#7cff4f'];
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * 7, s = 150 + Math.random() * 520;
      parts.push({ x: e.x, y: e.y - 40, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 250, life: 1.4, max: 1.4, size: 5 + Math.random() * 4,
        col: cols[i % cols.length], g: 1200, type: 'confetti', rot: Math.random() * 7, vr: (Math.random() - 0.5) * 20 });
    }
    // the head pops off and bounces around — extra funny with a face photo!
    parts.push({ x: e.x, y: e.y - 80, vx: (Math.random() - 0.5) * 500, vy: -700 - Math.random() * 300, life: 3, max: 3, size: e.face && e.bigHead ? 23 : 14,
      g: 1800, type: 'head', ent: { face: e.face, skin: e.skin, hair: e.hair, shirt: e.shirt }, rot: 0, vr: (Math.random() - 0.5) * 18, bounce: true });
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      if (p.type === 'smoke') { p.vx *= 0.96; p.vy *= 0.96; p.size += 20 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.bounce && p.vy > 0 && World.solidAt(p.x, p.y + (p.type === 'head' ? p.size : 2))) {
        p.vy *= -0.55; p.vx *= 0.75; p.vr *= 0.7;
        if (Math.abs(p.vy) < 60) { p.vy = 0; p.g = 0; p.vx *= 0.9; }
      }
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    for (let i = texts.length - 1; i >= 0; i--) { const x = texts[i]; x.life -= dt; x.y -= 60 * dt; if (x.life <= 0) texts.splice(i, 1); }
  }

  // ------------------------------------------------------------ bots --
  function botThink(e, dt) {
    const D = DIFF[settings.difficulty] || DIFF.normal;
    const ai = e.ai || (e.ai = { think: 0, target: null, goal: null, strafe: 1, react: 0, err: 0, jumpCd: 0, stuck: 0, aim: 0 });
    const c = { mx: 0, run: false, jump: false, jumpPressed: false, jet: false, down: false, fire: false, aim: ai.aim, reloadPressed: false, swapPressed: false };
    ai.think -= dt; ai.jumpCd -= dt; ai.react -= dt;
    ai.burst = (ai.burst == null ? 0 : ai.burst) - dt;
    if (ai.burst < -(0.25 + Math.random() * 0.6)) ai.burst = D.burst * (0.6 + Math.random() * 0.8);
    const eye = { x: e.x, y: e.y - 56 };
    if (ai.think <= 0) {
      ai.think = D.think * (0.7 + Math.random() * 0.6);
      let best = null, bd = 1e9;
      for (const o of ents.values()) {
        if (o === e || !o.alive || !o.seen) continue;
        let d = Math.hypot(o.x - e.x, o.y - e.y);
        const los = !World.rayBlocked(eye.x, eye.y, o.x, o.y - 45);
        if (!los) d *= 1.8;
        if (d < bd) { bd = d; best = o; }
      }
      if (ai.target !== best) ai.react = D.react;
      ai.target = best;
      ai.los = best && !World.rayBlocked(eye.x, eye.y, best.x, best.y - 45);
      ai.err = (Math.random() - 0.5) * 2 * D.err;
      if (Math.random() < 0.15) ai.strafe *= -1;
      // pickups: grab health when hurt, a better gun when holding only the pistol
      ai.goal = null;
      const now = performance.now();
      let gd = (ai.target && ai.los) ? 500 : 1400;
      M.pickups.forEach((p, i) => {
        if (pickAvail[i] > now) return;
        const want = p.type === 'health' ? e.hp < 60 : e.slots.length < 2;
        if (!want) return;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < gd) { gd = d; ai.goal = { x: p.x, y: p.y }; }
      });
      if (!ai.goal && !ai.target) ai.goal = { x: M.spawns[Math.floor(Math.random() * M.spawns.length)][0], y: 1300 };
    }
    const tg = ai.target;
    let gx = null, gy = null;
    if (ai.goal) { gx = ai.goal.x; gy = ai.goal.y; }
    else if (tg) {
      const dx = tg.x - e.x, ad = Math.abs(dx);
      if (!ai.los || ad > 520) { gx = tg.x; gy = tg.y; }
      else if (ad < 200) gx = e.x - Math.sign(dx) * 300;
      else gx = e.x + ai.strafe * 200;
      gy = gy == null ? tg.y : gy;
    }
    if (gx != null) {
      const dx = gx - e.x;
      if (Math.abs(dx) > 30) c.mx = Math.sign(dx);
      c.run = Math.abs(dx) > 500;
      if (Math.abs(e.vx) < 30 && c.mx && e.ground) ai.stuck += dt; else ai.stuck = 0;
      const above = gy < e.y - 110;
      if (e.ground && ai.jumpCd <= 0 && (ai.stuck > 0.15 || (above && Math.random() < 0.08) || Math.random() < 0.004)) {
        c.jumpPressed = true; ai.jumpCd = 0.45; ai.stuck = 0;
      }
      if (!e.ground && e.vy > 0 && e.jumps < 2 && above && Math.random() < 0.15) c.jumpPressed = true;
      c.jump = true;
      if (!e.ground && above && gy < e.y - 220 && e.fuel > 25 && e.vy > -150) c.jet = true;
      if (gy > e.y + 120 && e.onPlat && Math.abs(dx) < 400 && Math.random() < 0.05) c.down = true;
    }
    if (tg) {
      const want = Math.atan2(tg.y - 42 - (e.y - 56), tg.x - e.x) + ai.err;
      let da = ((want - ai.aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      ai.aim += da * Math.min(1, dt * 9);
      const dist = Math.hypot(tg.x - e.x, tg.y - e.y);
      c.fire = ai.burst > 0 && ai.los && ai.react <= 0 && dist < D.range && Math.abs(da) < 0.3 && tg.spawnT <= 0;
      if (e.weapon === 'rocket' && dist < 220) c.fire = false;
    } else ai.aim += (((c.mx < 0 ? Math.PI : 0) - ai.aim)) * Math.min(1, dt * 3);
    c.aim = ai.aim;
    const slot = e.slots[e.cur];
    if (slot.mag === 0) c.reloadPressed = true;
    if (e.slots.length > 1 && e.cur === 0) c.swapPressed = true;
    return c;
  }

  // -------------------------------------------------------- pickups --
  function checkPickups(e) {
    const now = performance.now();
    M.pickups.forEach((p, i) => {
      if (pickAvail[i] > now || pickPending[i] > now) return;
      if (Math.abs(e.x - p.x) < 34 && e.y > p.y - 80 && e.y < p.y + 20) {
        if (p.type === 'health' && e.hp >= 100) return;
        pickPending[i] = now + 800;
        Net.emit('pick', { i, by: e.id });
      }
    });
  }
  function giveWeapon(e, w) {
    const W = WEAPONS[w];
    const s = { w, mag: W.mag, res: W.reserve };
    if (e.slots.length > 1) e.slots[1] = s; else e.slots.push(s);
    e.cur = 1; e.reloadT = 0; e.cd = 0.15; e.weapon = w;
  }

  // -------------------------------------------------------- network --
  const pack = (e) => ({ x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
    a: +e.aim.toFixed(2), w: e.weapon, f: (e.crouch ? 1 : 0) | (e.jet ? 2 : 0) | (e.ground ? 4 : 0), id: e.id });
  function applyState(d) {
    const e = ents.get(d.id);
    if (!e || e.local) return;
    if (!e.seen || Math.hypot(d.x - e.x, d.y - e.y) > 400) { e.x = d.x; e.y = d.y; }
    e.seen = true;
    e.tgt = { x: d.x, y: d.y, vx: d.vx, vy: d.vy, at: performance.now() };
    e.aim = d.a; e.dir = Math.cos(d.a) >= 0 ? 1 : -1; e.weapon = WEAPONS[d.w] ? d.w : 'pistol';
    e.crouch = !!(d.f & 1); e.jet = !!(d.f & 2); e.ground = !!(d.f & 4);
  }
  function remoteTick(e, dt) {
    if (!e.tgt) return;
    const age = Math.min(0.2, (performance.now() - e.tgt.at) / 1000);
    const px = e.tgt.x + e.tgt.vx * age, py = e.tgt.y + (e.ground ? 0 : e.tgt.vy * age);
    const k = Math.min(1, dt * 14);
    e.x += (px - e.x) * k; e.y += (py - e.y) * k;
    e.vx = e.tgt.vx; e.vy = e.tgt.vy;
    if (e.jet && Math.random() < 0.6) parts.push({ x: e.x - e.dir * 18, y: e.y - 36, vx: (Math.random() - 0.5) * 60, vy: 220, life: 0.4, max: 0.4, size: 6, col: '#00e5ff', g: -200, type: 'glow' });
  }

  Net.on('st', applyState);
  Net.on('bots', (arr) => { for (const d of arr) applyState(d); });
  Net.on('shot', (d) => {
    if (!running || !Array.isArray(d.a)) return;
    const e = ents.get(d.id);
    if (e) { e.weapon = d.w; e.aim = d.a[0]; e.dir = Math.cos(d.a[0]) >= 0 ? 1 : -1; e.spawnT = 0; }
    spawnShots(d.id, d.x, d.y, d.a.slice(0, 10), WEAPONS[d.w] ? d.w : 'pistol', false);
  });
  Net.on('dmg', (d) => {
    const e = ents.get(d.t);
    if (!e) return;
    e.hp = d.hp; e.hurtT = 0.25;
    texts.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y - 100, txt: (d.hs ? '💥' : '') + '-' + d.dmg, col: d.hs ? '#ffe600' : '#fff', life: 0.9, size: d.hs ? 26 : 20 });
    if (d.t === myId) { flash('vignette'); SFX.hurt(); shake = Math.max(shake, 5); }
    if (d.a === myId && d.t !== myId) { SFX.hit(); hitmark(); }
  });
  Net.on('kill', (d) => {
    const v = ents.get(d.v), k = ents.get(d.k);
    if (v) { v.alive = false; v.hp = 0; v.deaths = (v.deaths || 0) + 1; confetti(v); v.jet = false; }
    if (k) k.kills = d.kk;
    const W = WEAPONS[d.w];
    feed(k ? k.name : '?', v ? v.name : '?', W ? W.name : '', d.hs, d.k === myId || d.v === myId, d.k === d.v);
    if (d.v === myId) {
      SFX.death(); deathMsgT = 3; killerId = d.k; killedBy = d.k === d.v ? 'yourself 🤦' : (k ? k.name : '?'); streak = 0;
    }
    if (d.k === myId && d.v !== myId) {
      SFX.kill(); streak++;
      const now = performance.now();
      multi.n = now - multi.t < 4000 ? multi.n + 1 : 1; multi.t = now;
      const label = ['', '', 'DOUBLE KILL!', 'TRIPLE KILL!', 'MEGA KILL!', 'UNSTOPPABLE!'][Math.min(5, multi.n)] ||
        (streak === 5 ? 'ON FIRE 🔥' : streak === 10 ? 'GODLIKE ⚡' : '');
      bigText(label || `+1  ${v ? v.name : ''} 💀`);
    }
    if (v && v.local && v.isBot) v.slots = [{ w: 'pistol', mag: 12, res: Infinity }];
  });
  Net.on('respawn', (d) => {
    const e = ents.get(d.id);
    if (!e) return;
    e.alive = true; e.hp = 100; e.spawnT = 1.6; e.hurtT = 0;
    placeAt(e, d.s); resetLoadout(e);
    ring(e.x, e.y - 40, '#7cff4f'); ring(e.x, e.y - 40, '#00e5ff');
    if (d.id === myId) deathMsgT = 0;
  });
  Net.on('picked', (d) => {
    const def = M.pickups[d.i];
    if (!def) return;
    pickAvail[d.i] = performance.now() + d.ms;
    const e = ents.get(d.by);
    if (!e) return;
    if (def.type === 'health') { e.hp = d.hp; texts.push({ x: e.x, y: e.y - 100, txt: '+50 ❤', col: '#7cff4f', life: 1, size: 22 }); }
    else if (e.local) giveWeapon(e, def.type);
    else e.weapon = def.type;
    sparks(def.x, def.y - 30, '#7cff4f', 14);
    if (d.by === myId) { SFX.pickup(); if (def.type !== 'health') bigText(WEAPONS[def.type].name + '!', 900); }
  });
  Net.on('left', (d) => ents.delete(d.id));
  Net.on('host', (d) => {
    hostId = d.id;
    for (const e of ents.values()) e.local = e.id === myId || (e.isBot && myId === hostId);
  });
  Net.on('emote', (d) => { const e = ents.get(d.id); if (e) e.emote = { e: d.e, t: 2.2 }; });
  Net.on('chat', (d) => {
    const log = $('chatlog'), el = document.createElement('div');
    el.textContent = `${d.name}: ${d.m}`;
    log.appendChild(el); while (log.children.length > 5) log.firstChild.remove();
    setTimeout(() => el.remove(), 9000);
    const e = ents.get(d.id); if (e) e.emote = { e: '💬', t: 2 };
  });

  // ------------------------------------------------------------- HUD --
  function flash(id) { const el = $(id); el.style.opacity = 0.55; setTimeout(() => (el.style.opacity = 0), 140); }
  function hitmark() { const el = $('hitmarker'); el.style.opacity = 1; el.style.transition = 'none'; requestAnimationFrame(() => { el.style.transition = 'opacity .25s'; el.style.opacity = 0; }); }
  let bigT = 0;
  function bigText(s, ms = 1400) { if (!s) return; const el = $('centerMsg'); el.textContent = s; bigT = ms / 1000; }
  function feed(k, v, w, hs, mine, self) {
    const kf = $('killfeed'), el = document.createElement('div');
    el.className = 'kf' + (mine ? ' me' : '');
    const b = (s) => { const x = document.createElement('b'); x.textContent = s; return x; };
    if (self) { el.append(b(v), document.createTextNode(' 🤦 self-destructed')); }
    else el.append(b(k), document.createTextNode(` ${hs ? '🎯' : '🔫'} ${w} `), b(v));
    kf.prepend(el);
    while (kf.children.length > 5) kf.lastChild.remove();
    setTimeout(() => el.remove(), 5000);
  }
  function renderBoard() {
    const rows = [...ents.values()].sort((a, b) => (b.kills || 0) - (a.kills || 0) || (a.deaths || 0) - (b.deaths || 0));
    const tb = $('boardBody'); tb.innerHTML = '';
    rows.forEach((e, i) => {
      const tr = document.createElement('tr'); if (e.id === myId) tr.className = 'me';
      [i + 1, (e.isBot ? '🤖 ' : '') + e.name, e.kills || 0, e.deaths || 0].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
      tb.appendChild(tr);
    });
  }
  let hudCache = {};
  function setHud(id, prop, val) { if (hudCache[id + prop] !== val) { hudCache[id + prop] = val; $(id).style[prop] = val; } }
  function setTxt(id, val) { if (hudCache[id] !== val) { hudCache[id] = val; $(id).innerHTML = val; } }
  const mm = $('minimap').getContext('2d');
  function updateHud(dt) {
    const m = me();
    if (!m) return;
    setTxt('hudScore', `${m.kills || 0} <small>KILLS</small>`);
    const left = Math.max(0, endsAt - performance.now()) / 1000;
    setTxt('hudTimer', `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
    $('hudTimer').classList.toggle('low', left < 30);
    setHud('hpFill', 'width', Math.max(0, m.hp) + '%');
    setTxt('hpTxt', Math.max(0, Math.round(m.hp)));
    setHud('jetFill', 'width', Math.round(m.fuel) + '%');
    const slot = m.slots[m.cur], W = WEAPONS[slot.w];
    setTxt('wName', W.name + (m.slots.length > 1 ? ' <small style="opacity:.6">⇄ ' + WEAPONS[m.slots[1 - m.cur].w].name + '</small>' : ''));
    setTxt('ammoTxt', `${slot.mag} <small>/ ${slot.res === Infinity ? '∞' : slot.res}</small>`);
    setTxt('reloadTxt', m.reloadT > 0 ? 'RELOADING…' : slot.mag === 0 ? (slot.res > 0 ? 'PRESS R' : 'EMPTY') : '');
    // center messages
    const cm = $('centerMsg');
    if (!m.alive && deathMsgT > 0) setTxt('centerMsg', `ELIMINATED<small>by ${escapeHtml(killedBy)} · respawning in ${Math.ceil(deathMsgT)}</small>`);
    else if (bigT > 0) { /* bigText already set */ }
    else if (cm.textContent) { cm.textContent = ''; hudCache.centerMsg = ''; }
    // minimap
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      const w = mm.canvas.width, h = mm.canvas.height, sx = w / M.W, sy = h / M.H;
      mm.clearRect(0, 0, w, h);
      mm.fillStyle = '#b14bff88';
      for (const s of M.solids) if (s.kind !== 'wall') mm.fillRect(s.x * sx, s.y * sy, Math.max(1, s.w * sx), Math.max(1, s.h * sy));
      mm.fillStyle = '#00e5ff99';
      for (const p of M.platforms) mm.fillRect(p.x * sx, p.y * sy, p.w * sx, 1.5);
      for (const e of ents.values()) {
        if (!e.alive || !e.seen) continue;
        mm.fillStyle = e.id === myId ? '#ffe600' : '#ff2e88';
        mm.beginPath(); mm.arc(e.x * sx, (e.y - 36) * sy, e.id === myId ? 3.5 : 2.5, 0, 7); mm.fill();
      }
      mm.strokeStyle = '#ffffff55'; mm.strokeRect(cam.x * sx, cam.y * sy, cam.w * sx, cam.h * sy);
      if ($('board').classList.contains('show')) renderBoard();
    }
  }
  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------- render --
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    SW = innerWidth; SH = innerHeight;
    cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
    cam.s = Math.max(SW / 2250, isTouch ? Math.min(SW / 1150, SH / 620) : Math.min(SW / 1350, SH / 780));
    cam.w = SW / cam.s; cam.h = SH / cam.s;
  }
  addEventListener('resize', resize);
  resize();

  function updateCam(dt) {
    const m = me();
    let tx = cam.x + cam.w / 2, ty = cam.y + cam.h / 2;
    const kk = m && !m.alive && ents.get(killerId);
    if (kk && kk.alive && kk.seen) { tx = kk.x; ty = kk.y - 120; }
    else if (m && m.seen) {
      tx = m.x; ty = m.y - 120;
      if (mouse.in && !isTouch) { tx += (mouse.x - SW / 2) / cam.s * 0.22; ty += (mouse.y - SH / 2) / cam.s * 0.22; }
      else { tx += Math.cos(m.aim) * 90; }
    }
    const k = Math.min(1, dt * 7);
    cam.x += (tx - cam.w / 2 - cam.x) * k;
    cam.y += (ty - cam.h / 2 - cam.y) * k;
    cam.x = Math.max(0, Math.min(M.W - cam.w, cam.x));
    if (cam.w > M.W) cam.x = (M.W - cam.w) / 2;
    cam.y = Math.max(-250, Math.min(1820 - cam.h, cam.y));
  }

  function drawPickups() {
    const now = performance.now();
    M.pickups.forEach((p, i) => {
      if (pickAvail[i] > now) return;
      const bob = Math.sin(t * 3 + i) * 6, y = p.y - 38 + bob;
      const col = p.type === 'health' ? '#7cff4f' : WEAPONS[p.type].col;
      const g = ctx.createRadialGradient(p.x, y, 2, p.x, y, 34);
      g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, 34, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(p.x, y);
      if (p.type === 'health') {
        ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 14;
        ctx.fillRect(-12, -4, 24, 8); ctx.fillRect(-4, -12, 8, 24);
      } else {
        ctx.rotate(Math.sin(t * 2 + i) * 0.25 - 0.2);
        ctx.scale(0.9, 0.9); ctx.translate(-WEAPONS[p.type].len / 3, 0);
        drawGunIcon(p.type);
      }
      ctx.restore();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 26, 6, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    });
  }
  function drawGunIcon(w) { // reuse fighter gun drawing via a fake fighter-less path
    const e = { weapon: w };
    ctx.save(); ctx.lineWidth = 1.6;
    const W = WEAPONS[w];
    ctx.fillStyle = '#1c1c28'; ctx.strokeStyle = W.col; ctx.shadowColor = W.col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(-10, -6, W.len + 14, 11, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(0, 4, 8, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = W.col; ctx.fillRect(-4, -2, W.len * 0.6, 3);
    ctx.font = '700 11px Rajdhani'; ctx.textAlign = 'center'; ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
    ctx.fillText(W.name, W.len / 2, -12);
    ctx.restore();
    return e;
  }

  function drawParts() {
    ctx.save();
    for (const p of parts) {
      const a = Math.max(0, p.life / p.max);
      switch (p.type) {
        case 'glow':
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = p.col;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
        case 'flash': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, p.col); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
        }
        case 'ring':
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 4 * a + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a * 0.8), 0, 7); ctx.stroke(); break;
        case 'smoke':
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.25; ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
        case 'shell':
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.col;
          ctx.fillRect(p.x - 2, p.y - 1, 4, 2); break;
        case 'confetti':
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.col;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break;
        case 'head': {
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a * 2);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          const img = Fighter.faceImg(p.ent.face);
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7);
          if (img) { ctx.save(); ctx.clip(); ctx.drawImage(img, -p.size, -p.size, p.size * 2, p.size * 2); ctx.restore(); }
          else {
            ctx.fillStyle = p.ent.skin; ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            [[-5, -3], [5, -3]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke(); });
            ctx.fillStyle = p.ent.hair; ctx.beginPath(); ctx.arc(0, -2, p.size, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
          }
          ctx.strokeStyle = p.ent.shirt; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7); ctx.stroke();
          ctx.restore(); break;
        }
      }
    }
    ctx.restore();
  }
  function drawBullets() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const b of bullets) {
      const W = WEAPONS[b.w];
      if (b.w === 'rocket') {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = '#ddd'; ctx.fillRect(-12, -4, 20, 8); ctx.fillStyle = W.col; ctx.fillRect(6, -4, 6, 8);
        ctx.fillStyle = '#ff7b00'; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-24 - Math.random() * 10, 0); ctx.lineTo(-12, 4); ctx.fill();
        ctx.restore(); continue;
      }
      const len = b.w === 'sniper' ? 0.06 : 0.02;
      ctx.strokeStyle = W.col; ctx.lineWidth = b.w === 'sniper' ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * len, b.y - b.vy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * len * 0.4, b.y - b.vy * len * 0.4); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    World.drawBackground(ctx, cam, t, SW, SH);
    const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    const S = cam.s * dpr;
    ctx.setTransform(S, 0, 0, S, (-cam.x * cam.s + sx) * dpr, (-cam.y * cam.s + sy) * dpr);
    World.drawWorld(ctx, cam, t);
    drawPickups();
    const list = [...ents.values()].filter((e) => e.alive && e.seen);
    list.sort((a, b) => (a.id === myId) - (b.id === myId));
    for (const e of list) Fighter.draw(ctx, e, t);
    drawBullets();
    drawParts();
    for (const e of list) Fighter.drawTag(ctx, e, e.id === myId);
    // emote bubbles
    ctx.textAlign = 'center';
    for (const e of ents.values()) {
      if (!e.emote || !e.alive || !e.seen) continue;
      const sc = Math.min(1, (2.2 - e.emote.t) * 6);
      ctx.font = `${Math.round(38 * sc)}px serif`;
      ctx.fillText(e.emote.e, e.x, e.y - (e.face && e.bigHead ? 140 : 118) + Math.sin(t * 6) * 3);
    }
    for (const x of texts) {
      ctx.globalAlpha = Math.min(1, x.life * 2);
      ctx.font = `bold ${x.size}px Bungee, sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
      ctx.strokeText(x.txt, x.x, x.y); ctx.fillStyle = x.col; ctx.fillText(x.txt, x.x, x.y);
    }
    ctx.globalAlpha = 1;
    // crosshair
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = me();
    if (!isTouch && mouse.in && m && m.alive) {
      const r = 10 + (m.recoil || 0) * 8;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, r, 0, 7);
      ctx.moveTo(mouse.x - r - 6, mouse.y); ctx.lineTo(mouse.x - r + 4, mouse.y);
      ctx.moveTo(mouse.x + r + 6, mouse.y); ctx.lineTo(mouse.x + r - 4, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - r - 6); ctx.lineTo(mouse.x, mouse.y - r + 4);
      ctx.moveTo(mouse.x, mouse.y + r + 6); ctx.lineTo(mouse.x, mouse.y + r - 4); ctx.stroke(); ctx.shadowBlur = 0;
    }
    if (isTouch && m && m.alive) { // aim laser for touch players
      const tip = gunTip(m);
      ctx.setTransform(S, 0, 0, S, -cam.x * cam.s * dpr, -cam.y * cam.s * dpr);
      const g = ctx.createLinearGradient(tip.x, tip.y, tip.x + Math.cos(m.aim) * 400, tip.y + Math.sin(m.aim) * 400);
      g.addColorStop(0, 'rgba(255,46,136,0.6)'); g.addColorStop(1, 'rgba(255,46,136,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + Math.cos(m.aim) * 400, tip.y + Math.sin(m.aim) * 400); ctx.stroke();
    }
  }

  // ------------------------------------------------------------ loop --
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    if (!paused || Net.mode === 'online') step(dt);
    render();
  }
  function step(dt) {
    const m = me();
    readInput(m);
    if (paused) { inp.mx = 0; inp.fire = false; inp.jet = false; inp.jumpPressed = false; }
    for (const e of ents.values()) {
      e.recoil = Math.max(0, (e.recoil || 0) - dt * 6);
      e.hurtT -= dt; e.spawnT -= dt;
      if (e.emote && (e.emote.t -= dt) <= 0) e.emote = null;
      if (!e.alive) continue;
      if (e.id === myId) control(e, inp, dt);
      else if (e.local && e.isBot) control(e, botThink(e, dt), dt);
      else remoteTick(e, dt);
      if (e.ground && Math.abs(e.vx) > 20) e.walkPh += dt * Math.abs(e.vx) / 26;
      if (e.local) checkPickups(e);
    }
    inp.jumpPressed = inp.reloadPressed = inp.swapPressed = false;
    updateBullets(dt);
    updateParts(dt);
    updateCam(dt);
    shake = Math.max(0, shake - dt * 30);
    deathMsgT = Math.max(0, deathMsgT - dt);
    bigT -= dt;
    sendT -= dt;
    if (sendT <= 0 && Net.mode === 'online') {
      sendT = 1 / 15;
      if (m && m.alive) Net.emit('st', pack(m));
      if (myId === hostId) {
        const arr = [];
        for (const e of ents.values()) if (e.isBot && e.alive) arr.push(pack(e));
        if (arr.length) Net.emit('bots', arr);
      }
    }
    updateHud(dt);
  }

  function togglePause(force) {
    paused = force != null ? force : !paused;
    $('pause').classList.toggle('show', paused);
  }

  // ------------------------------------------------------------- api --
  return {
    isTouch,
    start(info, id, host) {
      myId = id; hostId = host; settings = info.settings || {};
      endsAt = performance.now() + (info.left || 0);
      ents = new Map(); bullets = []; parts = []; texts = [];
      pickAvail = M.pickups.map((_, i) => performance.now() + ((info.pickups && info.pickups[i]) || 0));
      pickPending = M.pickups.map(() => 0);
      syncRoster(info.players);
      for (const p of info.players) {
        const e = ents.get(p.id);
        e.alive = p.alive; e.hp = p.hp;
        if (info.spawns && info.spawns[p.id] != null) { placeAt(e, info.spawns[p.id]); e.spawnT = 1.2; }
      }
      const m = me();
      if (m && m.seen) { cam.x = m.x - cam.w / 2; cam.y = m.y - cam.h / 2; }
      streak = 0; deathMsgT = 0; bigT = 0; hudCache = {};
      $('killfeed').innerHTML = ''; $('chatlog').innerHTML = '';
      togglePause(false);
      Fighter.avatar($('hudFace'), m || {});
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      bigText('FIGHT!', 1200);
    },
    roster(snap) { if (running) { hostId = snap.hostId; syncRoster(snap.players); if (snap.settings) settings = snap.settings; } },
    stop() { running = false; ents = new Map(); bullets = []; parts = []; $('board').classList.remove('show'); togglePause(false); },
    get running() { return running; },
    togglePause,
    showBoard(on) { $('board').classList.toggle('show', on); renderBoard(); },
    resize
  };
})();
