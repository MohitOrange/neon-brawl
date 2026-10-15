// Neon Brawl — weapons + procedural fighter drawing (male / female, face photos, big-head mode)
const WEAPONS = {
  pistol:  { name: 'PISTOL',   dmg: 18, rate: 0.24, speed: 1700, mag: 12, reserve: Infinity, reload: 1.0, spread: 0.03, pellets: 1, len: 22, col: '#ffd98a', shake: 2, kick: 40 },
  smg:     { name: 'SMG',      dmg: 11, rate: 0.085, speed: 1800, mag: 32, reserve: 96, reload: 1.4, spread: 0.07, pellets: 1, len: 32, col: '#ffe7a3', shake: 1.4, kick: 25 },
  shotgun: { name: 'SHOTGUN',  dmg: 10, rate: 0.75, speed: 1500, mag: 6, reserve: 18, reload: 1.6, spread: 0.2, pellets: 7, len: 38, col: '#ffbe6b', shake: 7, kick: 260, life: 0.36 },
  sniper:  { name: 'SNIPER',   dmg: 76, rate: 1.1, speed: 3800, mag: 5, reserve: 10, reload: 2.0, spread: 0.003, pellets: 1, len: 54, col: '#fff6d8', shake: 5, kick: 160 },
  rocket:  { name: 'ROCKET',   dmg: 88, rate: 1.0, speed: 950, mag: 1, reserve: 5, reload: 1.4, spread: 0.015, pellets: 1, len: 44, col: '#ff9a3c', shake: 6, kick: 200, splash: 160 }
};

const Fighter = (() => {
  const faceCache = new Map();
  function faceImg(url) {
    if (!url) return null;
    let im = faceCache.get(url);
    if (!im) { im = new Image(); im.src = url; faceCache.set(url, im); }
    return im.complete && im.naturalWidth ? im : null;
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  };

  function drawGun(ctx, w, recoil) {
    ctx.save();
    ctx.translate(-recoil * 7, 0);
    ctx.lineJoin = 'round';
    const metal = '#2e3033', dark = '#17181a', wood = '#7a4f2a', olive = '#4a5130';
    const r = (x, y, ww, hh, col, rad = 2) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rad); ctx.fill(); };
    switch (w) {
      case 'pistol':
        r(-2, -5, 22, 7, metal); r(-2, -5, 22, 2, '#4a4d52'); r(0, 1, 7, 10, dark, 3); r(6, 1, 5, 3, dark); break;
      case 'smg':
        r(-14, -3, 10, 6, dark); r(-6, -5, 32, 9, metal); r(24, -3, 8, 4, dark); r(-6, -5, 32, 2, '#4a4d52');
        r(2, 3, 6, 9, dark, 2); r(13, 3, 5, 14, '#3a3c40', 1); r(6, -9, 10, 4, dark); break;
      case 'shotgun':
        r(-22, -3, 16, 9, wood, 3); r(-8, -4, 44, 7, metal); r(-8, -4, 44, 2, '#55585c'); r(8, 3, 18, 6, wood, 3); r(-6, 2, 5, 8, dark); break;
      case 'sniper':
        r(-24, -3, 18, 10, olive, 3); r(-8, -4, 34, 8, olive); r(24, -2, 32, 4, metal); r(54, -3, 6, 6, dark);
        r(2, -12, 24, 6, dark, 3); ctx.fillStyle = '#7fb2d8'; ctx.beginPath(); ctx.arc(25, -9, 2.2, 0, 7); ctx.fill();
        r(0, 3, 6, 9, dark); r(30, 2, 2, 10, dark); r(36, 2, 2, 10, dark); break;
      case 'rocket':
        r(-26, -8, 64, 15, olive, 5); r(-26, -8, 64, 3, 'rgba(255,255,255,0.15)', 2); r(-30, -9, 8, 17, dark, 2); r(36, -9, 8, 17, dark, 2);
        r(0, 6, 7, 10, dark); r(12, 6, 6, 8, dark); r(4, -14, 14, 6, dark, 2);
        ctx.fillStyle = '#c9a33b'; ctx.fillRect(-12, -6, 3, 11); break;
    }
    ctx.restore();
  }

  function drawDefaultFace(ctx, e, r, t) {
    const hurt = e.hurtT > 0, dead = !e.alive;
    ctx.fillStyle = '#111';
    const blink = Math.sin(t * 2.3 + (e.seed || 0)) > 0.985;
    if (dead || hurt) {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      [[r * 0.15, -r * 0.15], [r * 0.6, -r * 0.15]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
      });
      ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.45, 4, 3, 0, 0, 7); ctx.fill();
    } else {
      if (blink) { ctx.fillRect(r * 0.1, -r * 0.15, 6, 2); ctx.fillRect(r * 0.55, -r * 0.15, 6, 2); }
      else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.12, 3.6, 4.4, 0, 0, 7); ctx.ellipse(r * 0.65, -r * 0.12, 3.6, 4.4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(r * 0.27, -r * 0.1, 2, 0, 7); ctx.arc(r * 0.7, -r * 0.1, 2, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(r * 0.45, r * 0.3, r * 0.28, 0.2, Math.PI - 0.6); ctx.stroke();
      if (e.gender === 'female') { // lashes + blush
        ctx.fillStyle = 'rgba(255,90,140,0.45)';
        ctx.beginPath(); ctx.arc(r * 0.05, r * 0.25, 3, 0, 7); ctx.arc(r * 0.82, r * 0.25, 3, 0, 7); ctx.fill();
      }
    }
  }

  /** draw a full fighter. e: {x,y,dir,aim,vx,ground,crouch,jet,walkPh,weapon,recoil,hurtT,alive,...profile} */
  function draw(ctx, e, t) {
    const s = e.dir;
    const c = e.crouch ? 14 : 0;
    const fem = e.gender === 'female';
    const face = faceImg(e.face);
    const headR = face && e.bigHead ? 23 : face ? 15 : 13;
    const sp = Math.min(1, Math.abs(e.vx) / 300);
    const ph = e.walkPh || 0;

    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.spawnT > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 40);
    // ground shadow
    if (e.ground) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 5, 0, 0, 7); ctx.fill(); }
    ctx.scale(s, 1);

    const hipY = -34 + c;
    // jetpack flame
    if (e.jet) {
      const fl = 18 + Math.random() * 16;
      const g = ctx.createLinearGradient(0, -36 + c, 0, -36 + c + fl);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.25, '#ffc14d'); g.addColorStop(0.6, '#ff6a1f'); g.addColorStop(1, 'rgba(120,120,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-23, -36 + c); ctx.lineTo(-13, -36 + c); ctx.lineTo(-18, -36 + c + fl); ctx.fill();
    }
    // legs
    const pants = e.pants || '#3d4029';
    const legA = e.ground ? Math.sin(ph) * 0.75 * sp : 0.55, legB = e.ground ? -Math.sin(ph) * 0.75 * sp : -0.35;
    const leg = (a, front) => {
      const L = e.crouch ? 22 : 32;
      const kx = Math.sin(a) * L * 0.5 + (e.crouch ? 8 : 0), ky = hipY + Math.cos(a) * L * 0.5;
      const fx = Math.sin(a) * L, fy = hipY + Math.cos(a) * L + (e.crouch ? 10 : 0);
      ctx.strokeStyle = front ? pants : shade(pants, 0.75); ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(front ? 3 : -3, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, Math.min(0, fy)); ctx.stroke();
      ctx.fillStyle = '#2a2118'; ctx.beginPath(); ctx.ellipse(fx + 4, Math.min(-2, fy - 2), 7, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#14100b'; ctx.fillRect(fx - 3, Math.min(-2, fy - 2) + 2, 14, 2);
    };
    leg(legB, false);

    // jetpack body
    ctx.fillStyle = '#5b5f62'; ctx.strokeStyle = '#2b2d2f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-25, -62 + c, 13, 27, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-23, -60 + c, 3, 22);
    ctx.fillStyle = '#2b2d2f'; ctx.fillRect(-23, -37 + c, 9, 3);
    ctx.fillStyle = '#c23b22'; ctx.fillRect(-22, -57 + c, 7, 3);

    // back arm
    const la = s === 1 ? e.aim : Math.PI - e.aim;
    const shY = -56 + c;
    const handX = Math.cos(la) * 15, handY = shY + Math.sin(la) * 15;
    ctx.strokeStyle = shade(e.skin, 0.8); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-4, shY + 2); ctx.lineTo(handX + Math.cos(la) * 8, handY + Math.sin(la) * 8); ctx.stroke();

    leg(legA, true);

    // torso
    const sh = e.shirt || '#5b6b2f';
    ctx.fillStyle = sh;
    ctx.beginPath();
    if (fem) { ctx.moveTo(-11, -64 + c); ctx.lineTo(11, -64 + c); ctx.lineTo(8, -46 + c); ctx.lineTo(13, -30 + c); ctx.lineTo(-13, -30 + c); ctx.lineTo(-8, -46 + c); ctx.closePath(); }
    else ctx.roundRect(-13, -65 + c, 26, 35, 7);
    ctx.fill();
    // tactical vest + pouches + belt
    ctx.fillStyle = shade(sh, 0.72);
    ctx.beginPath(); ctx.roundRect(fem ? -10 : -12, -60 + c, fem ? 20 : 24, 22, 4); ctx.fill();
    ctx.fillStyle = shade(sh, 0.55);
    for (let k = 0; k < 3; k++) ctx.fillRect((fem ? -8 : -10) + k * (fem ? 6 : 7.5), -50 + c, fem ? 5 : 6, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(fem ? -10 : -12, -60 + c, fem ? 20 : 24, 2);
    ctx.fillStyle = '#2a2418'; ctx.fillRect(fem ? -12 : -13, -35 + c, fem ? 24 : 26, 4);
    ctx.fillStyle = '#b89a4a'; ctx.fillRect(-2, -35 + c, 4, 4);

    // long hair behind head (female)
    const hx = 2, hy = -64 + c - headR + 3;
    const hair = e.hair || '#222';
    if (fem) {
      const sw = Math.sin(t * 6 + ph) * 3 - e.vx * 0.012 * s;
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.moveTo(hx - headR * 0.9, hy - headR * 0.3);
      ctx.quadraticCurveTo(hx - headR * 1.7 + sw, hy + headR * 1.3, hx - headR * 0.6 + sw, hy + headR + 14);
      ctx.lineTo(hx + headR * 0.2, hy + headR * 0.7); ctx.closePath(); ctx.fill();
      // ponytail
      ctx.beginPath(); ctx.ellipse(hx - headR * 1.15 + sw, hy - headR * 0.3, 6, 11, 0.6 + sw * 0.05, 0, 7); ctx.fill();
    }

    // head
    ctx.save();
    ctx.translate(hx, hy);
    if (face) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, headR, 0, 7); ctx.clip();
      if (s === -1) ctx.scale(-1, 1); // keep photo un-mirrored
      ctx.drawImage(face, -headR, -headR, headR * 2, headR * 2);
      ctx.restore();
      ctx.strokeStyle = e.shirt; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, headR, 0, 7); ctx.stroke();
      if (e.hurtT > 0 || !e.alive) { ctx.fillStyle = 'rgba(255,0,0,0.35)'; ctx.beginPath(); ctx.arc(0, 0, headR, 0, 7); ctx.fill(); }
    } else {
      ctx.fillStyle = e.skin; ctx.beginPath(); ctx.arc(0, 0, headR, 0, 7); ctx.fill();
      ctx.fillStyle = shade(e.skin, 0.85); ctx.beginPath(); ctx.arc(-headR * 0.85, 1, 3, 0, 7); ctx.fill(); // ear
      drawDefaultFace(ctx, e, headR, t);
      ctx.fillStyle = hair;
      ctx.beginPath();
      if (fem) { // bangs
        ctx.arc(0, -2, headR + 1.5, Math.PI * 1.02, Math.PI * 1.95); ctx.quadraticCurveTo(headR * 0.3, -headR * 0.35, -headR * 0.4, -headR * 0.45);
        ctx.lineTo(-headR - 1, 2);
      } else { // spiky crop
        ctx.moveTo(-headR - 1, 0);
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI + (i / 6) * Math.PI * 0.95;
          const rr = headR + (i % 2 ? 6 : 1.5);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - 1);
        }
        ctx.lineTo(headR * 0.4, -headR * 0.5); ctx.lineTo(-headR * 0.5, -headR * 0.2);
      }
      ctx.closePath(); ctx.fill();
      // headphones / visor accent
      ctx.fillStyle = e.shirt; ctx.fillRect(-headR * 0.9, -headR * 0.15, 4, 7);
    }
    ctx.restore();

    // front arm + gun
    ctx.save();
    ctx.translate(2, shY);
    ctx.rotate(la);
    ctx.strokeStyle = sh; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.strokeStyle = e.skin; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(15, 0); ctx.stroke();
    ctx.translate(15, 0);
    if (Math.cos(la) < 0) ctx.scale(1, -1);
    drawGun(ctx, e.weapon, e.recoil || 0);
    ctx.restore();

    ctx.restore();
  }

  function drawTag(ctx, e, me) {
    const face = e.face && e.bigHead;
    const y = e.y - (e.crouch ? 14 : 0) - (face ? 118 : 96);
    ctx.font = '600 15px "Barlow Condensed", "Arial Narrow", sans-serif'; ctx.textAlign = 'center';
    const w = Math.max(56, ctx.measureText(e.name).width + 12);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(e.x - w / 2, y - 14, w, 18, 6); ctx.fill();
    ctx.fillStyle = me ? '#ffd34d' : e.isBot ? '#d8d0b8' : '#fff';
    ctx.fillText(e.name, e.x, y);
    const hp = Math.max(0, e.hp) / 100;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 24, y + 6, 48, 5);
    ctx.fillStyle = hp > 0.5 ? '#6fcf4a' : hp > 0.25 ? '#e6c13a' : '#d9412b';
    ctx.fillRect(e.x - 24, y + 6, 48 * hp, 5);
  }

  /** draw a head-and-shoulders avatar into a small square canvas */
  function avatar(canvas, p) {
    const g = canvas.getContext('2d');
    const S = canvas.width;
    g.clearRect(0, 0, S, S);
    const face = faceImg(p.face);
    if (p.face && !face) { const im = new Image(); im.onload = () => avatar(canvas, p); im.src = p.face; }
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip();
    const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#9cc3df'); bg.addColorStop(0.7, '#d9e4d0'); bg.addColorStop(1, '#6f8f52');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    if (face) g.drawImage(face, 0, 0, S, S);
    else {
      const sc = S / 40;
      g.translate(S / 2 - 2 * sc, S * 0.47 + 74 * sc); g.scale(sc, sc);
      draw(g, Object.assign({}, p, { x: 0, y: 0, dir: 1, aim: 0.3, vx: 0, ground: false, alive: true, hurtT: 0, weapon: null, walkPh: 0, face: null, jet: false, crouch: false }), 0);
    }
    g.restore();
  }

  return { draw, drawTag, avatar, faceImg, drawGun };
})();
