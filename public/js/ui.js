// Neon Brawl — menus, character creator, room lobby, end screen
(() => {
  const $ = (id) => document.getElementById(id);
  const screens = ['menu', 'room', 'hud', 'end'];
  const show = (id) => screens.forEach((s) => $(s).classList.toggle('active', s === id));
  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };

  // ------------------------------------------------------- profile --
  const defaults = { name: '', gender: 'male', skin: NB.SKINS[1], hair: NB.HAIRS[0], shirt: NB.COLORS[0], pants: '#3d4029', face: null, bigHead: true };
  let profile = Object.assign({}, defaults);
  try { Object.assign(profile, JSON.parse(localStorage.getItem('nb_profile') || '{}')); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem('nb_profile', JSON.stringify(profile)); } catch (e) { toast('Could not save profile (storage full)'); } };
  const funny = ['Captain', 'Lil', 'Turbo', 'Mega', 'Sir', 'DJ', 'Agent', 'Big'], funny2 = ['Banana', 'Noodle', 'Blaster', 'Pickle', 'Thunder', 'Waffle', 'Laser', 'Taco'];
  if (!profile.name) profile.name = funny[Math.floor(Math.random() * 8)] + ' ' + funny2[Math.floor(Math.random() * 8)];

  $('nameInput').value = profile.name;
  $('nameInput').addEventListener('input', (e) => { profile.name = e.target.value.slice(0, 16); save(); });
  $('bigHead').checked = profile.bigHead !== false;
  $('bigHead').addEventListener('change', (e) => { profile.bigHead = e.target.checked; save(); });

  function swatches(el, list, key) {
    el.innerHTML = '';
    list.forEach((c) => {
      const b = document.createElement('div');
      b.className = 'sw' + (profile[key] === c ? ' on' : '');
      b.style.background = c; b.style.color = c;
      b.onclick = () => { profile[key] = c; save(); SFX.init(); SFX.click(); swatches(el, list, key); };
      el.appendChild(b);
    });
  }
  swatches($('skinSw'), NB.SKINS, 'skin');
  swatches($('hairSw'), NB.HAIRS, 'hair');
  swatches($('shirtSw'), NB.COLORS, 'shirt');

  document.querySelectorAll('#genderSeg button').forEach((b) => {
    b.classList.toggle('on', b.dataset.g === profile.gender);
    b.onclick = () => { profile.gender = b.dataset.g; save(); SFX.init(); SFX.click();
      document.querySelectorAll('#genderSeg button').forEach((x) => x.classList.toggle('on', x === b)); };
  });

  // face photo → 128px round-friendly square JPEG
  $('faceInput').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      const m = Math.min(im.width, im.height);
      // bias the crop slightly upward — faces are usually in the upper part of a photo
      const sx = (im.width - m) / 2, sy = Math.max(0, (im.height - m) / 2 - (im.height - m) * 0.25);
      g.drawImage(im, sx, sy, m, m, 0, 0, S, S);
      profile.face = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      save(); updateFaceBtns(); toast('Looking good! 😎 Your face is in the game');
    };
    im.onerror = () => toast('Could not read that image');
    im.src = url;
    e.target.value = '';
  });
  $('faceRemove').onclick = () => { profile.face = null; save(); updateFaceBtns(); };
  const updateFaceBtns = () => { $('faceRemove').hidden = !profile.face; };
  updateFaceBtns();

  // animated preview
  const pv = $('preview'), pg = pv.getContext('2d');
  let pmx = 0.95, pmy = 0.48, pmMoved = false;
  addEventListener('mousemove', (e) => { const r = pv.getBoundingClientRect(); pmx = (e.clientX - r.left) / r.width; pmy = (e.clientY - r.top) / r.height; pmMoved = true; });
  function previewLoop(ts) {
    requestAnimationFrame(previewLoop);
    if (!$('menu').classList.contains('active')) return;
    const t = ts / 1000;
    const dp = Math.min(2, devicePixelRatio || 1);
    if (pv.width !== 260 * dp) { pv.width = pv.height = 260 * dp; }
    pg.setTransform(dp, 0, 0, dp, 0, 0);
    pg.clearRect(0, 0, 260, 260);
    // pad
    // patch of ground: dirt, grass rim, a couple of sandbags
    pg.fillStyle = '#4a3524'; pg.beginPath(); pg.ellipse(130, 226, 92, 16, 0, 0, 7); pg.fill();
    pg.fillStyle = '#5f9a3a'; pg.beginPath(); pg.ellipse(130, 220, 92, 12, 0, 0, 7); pg.fill();
    pg.fillStyle = '#7fb74f'; pg.beginPath(); pg.ellipse(130, 218, 84, 9, 0, 0, 7); pg.fill();
    [[52, 206], [72, 206], [62, 196], [190, 206]].forEach(([x, y]) => { pg.fillStyle = '#b39d6e'; pg.beginPath(); pg.roundRect(x, y, 22, 11, 5); pg.fill(); pg.fillStyle = 'rgba(0,0,0,0.15)'; pg.fillRect(x + 2, y + 8, 18, 3); });
    pg.fillStyle = 'rgba(0,0,0,0.25)'; pg.beginPath(); pg.ellipse(130, 220, 30, 5, 0, 0, 7); pg.fill();
    pg.save(); pg.translate(130, 220); pg.scale(2, 2);
    const aim = pmMoved ? Math.atan2((pmy * 260 - 110), (pmx * 260 - 130)) : Math.sin(t * 0.8) * 0.3 - 0.05;
    Fighter.draw(pg, Object.assign({}, profile, { x: 0, y: Math.sin(t * 3) * 1.2, dir: Math.cos(aim) >= 0 ? 1 : -1, aim, vx: 0,
      ground: true, alive: true, hurtT: 0, weapon: ['pistol', 'smg', 'shotgun', 'sniper', 'rocket'][Math.floor(t / 2.5) % 5],
      walkPh: 0, recoil: Math.max(0, Math.sin(t * 5)) > 0.97 ? 1 : 0, jet: Math.sin(t * 0.7) > 0.8 }), t);
    pg.restore();
  }
  requestAnimationFrame(previewLoop);

  // ------------------------------------------------------- buttons --
  let botN = 5, diff = 'normal', lastSolo = null, roomSnap = null, inMatch = false, wantMenu = false;
  $('botCount').oninput = (e) => { botN = +e.target.value; $('botCountTxt').textContent = botN; };
  document.querySelectorAll('#diffSeg button').forEach((b) => b.onclick = () => {
    diff = b.dataset.d; document.querySelectorAll('#diffSeg button').forEach((x) => x.classList.toggle('on', x === b));
  });
  const clean = () => Object.assign({}, profile, { name: (profile.name || '').trim() || 'Player' });

  function goFull() {
    if (!Game.isTouch) return;
    const d = document.documentElement;
    try { (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); } catch (e) { /* ignore */ }
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ }
  }
  function startSolo() {
    SFX.init(); SFX.music(true); goFull();
    lastSolo = { bots: botN, diff };
    Net.leave();
    Net.offline(clean(), botN, diff);
  }
  $('btnBots').onclick = startSolo;
  $('btnQuick').onclick = () => {
    SFX.init();
    if (!Net.canPlayOnline) return toast('Online play is not available in this browser — try PLAY VS BOTS 🤖');
    SFX.music(true); goFull(); lastSolo = null;
    Net.online_('quick', null, clean()); toast('Finding a match…');
  };
  $('btnCreate').onclick = () => {
    SFX.init();
    if (!Net.canPlayOnline) return toast('Online play is not available in this browser');
    lastSolo = null; Net.online_('create', null, clean()); toast('Creating room…');
  };
  $('btnJoin').onclick = () => {
    SFX.init();
    const code = $('codeInput').value.trim().toUpperCase();
    if (code.length < 4) return toast('Enter a room code');
    if (!Net.canPlayOnline) return toast('Online play is not available in this browser');
    lastSolo = null; Net.online_('join', { code }, clean()); toast('Joining room ' + code + '…');
  };
  $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnJoin').click(); });
  const qs = new URLSearchParams(location.search).get('room');
  if (qs) $('codeInput').value = qs.toUpperCase();

  function toMenu() {
    Net.leave(); Game.stop(); inMatch = false; roomSnap = null; SFX.music(false);
    show('menu');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
  $('leaveRoom').onclick = toMenu;
  $('quitBtn').onclick = toMenu;
  $('endMenu').onclick = toMenu;
  $('resumeBtn').onclick = () => Game.togglePause(false);
  $('hudMenu').onclick = () => Game.togglePause();
  $('hudBoard').onclick = () => Game.showBoard(!$('board').classList.contains('show'));
  $('board').onclick = () => Game.showBoard(false);
  const soundIcon = () => { const i = SFX.muted ? '🔇' : '🔊'; $('soundBtn').textContent = i; $('pSound').textContent = i + ' SOUND'; };
  $('soundBtn').onclick = $('pSound').onclick = () => { SFX.toggle(); soundIcon(); };
  soundIcon();
  $('fsBtn').onclick = () => { const d = document.documentElement; if (!document.fullscreenElement) (d.requestFullscreen || d.webkitRequestFullscreen).call(d); else document.exitFullscreen(); };
  $('againBtn').onclick = () => {
    if (lastSolo) { botN = lastSolo.bots; diff = lastSolo.diff; startSolo(); }
    else if (roomSnap && !roomSnap.autoFill) showRoom(roomSnap);
    else toast('Next match starts automatically ⏳');
  };
  $('rotateOk').onclick = () => { $('rotateHint').style.display = 'none'; };
  const about = (on) => { $('about').classList.toggle('show', on); if (on) { SFX.init(); SFX.click(); } };
  $('aboutBtn').onclick = () => about(true);
  $('creditLink').onclick = (e) => { e.preventDefault(); about(true); };
  $('aboutClose').onclick = () => about(false);
  $('about').onclick = (e) => { if (e.target.id === 'about') about(false); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') about(false); });

  // room controls
  $('addBot').onclick = () => Net.emit('addBot');
  $('remBot').onclick = () => Net.emit('removeBot');
  $('startBtn').onclick = () => { SFX.init(); SFX.music(true); goFull(); Net.emit('start'); };
  ['setTime', 'setKills', 'setDiff'].forEach((id) => $(id).onchange = () => Net.emit('settings',
    { time: +$('setTime').value, killLimit: +$('setKills').value, difficulty: $('setDiff').value }));
  $('copyLink').onclick = () => {
    const url = location.origin + location.pathname + '?room=' + (roomSnap && roomSnap.code);
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Invite link copied! 🔗'), () => toast(url));
  };

  function showRoom(s) {
    show('room');
    $('roomCode').textContent = s.code;
    const host = s.hostId === Net.id;
    $('hostCtrl').style.display = host ? '' : 'none';
    $('waitHost').style.display = host ? 'none' : '';
    $('setTime').value = s.settings.time; $('setKills').value = s.settings.killLimit; $('setDiff').value = s.settings.difficulty;
    const box = $('roomPlayers'); box.innerHTML = '';
    for (const p of s.players) {
      const d = document.createElement('div');
      d.className = 'pcard' + (p.id === s.hostId ? ' host' : '');
      const c = document.createElement('canvas'); c.width = c.height = 88;
      Fighter.avatar(c, p);
      const info = document.createElement('div');
      const n = document.createElement('div'); n.className = 'n'; n.textContent = p.name;
      const b = document.createElement('div'); b.className = 'b';
      b.textContent = (p.isBot ? '🤖 BOT' : p.id === s.hostId ? '👑 HOST' : '🎮 PLAYER') + (p.id === Net.id ? ' · YOU' : '');
      info.append(n, b); d.append(c, info); box.appendChild(d);
    }
  }

  function showEnd(standings) {
    show('end');
    const pod = $('podium'); pod.innerHTML = '';
    [1, 0, 2].forEach((i) => {
      const p = standings[i]; if (!p) return;
      const d = document.createElement('div'); d.className = 'pod p' + (i + 1);
      const c = document.createElement('canvas'); c.width = c.height = 140; Fighter.avatar(c, p);
      const n = document.createElement('div'); n.className = 'n'; n.textContent = p.name;
      const blk = document.createElement('div'); blk.className = 'blk'; blk.textContent = i + 1;
      d.append(c, n, blk); pod.appendChild(d);
    });
    const st = $('standings'); st.innerHTML = '';
    standings.forEach((p, i) => {
      const r = document.createElement('div'); if (p.id === Net.id) r.className = 'me';
      const a = document.createElement('span'); a.textContent = `${i + 1}. ${p.isBot ? '🤖 ' : ''}${p.name}`;
      const b = document.createElement('span'); b.textContent = `${p.kills} K · ${p.deaths} D`;
      r.append(a, b); st.appendChild(r);
    });
    const meIdx = standings.findIndex((p) => p.id === Net.id);
    if (meIdx === 0) SFX.kill();
    $('againBtn').textContent = lastSolo ? '↻ PLAY AGAIN' : roomSnap && roomSnap.autoFill ? '⏳ NEXT MATCH SOON' : '↻ BACK TO ROOM';
  }

  // --------------------------------------------------------- network --
  Net.on('online', (d) => {
    const pill = $('onlinePill');
    if (d.n < 0 && d.p2p) { pill.className = 'pill on'; $('onlineTxt').textContent = 'online · play with friends'; }
    else if (d.n < 0) { pill.className = 'pill off'; $('onlineTxt').textContent = 'offline · bots only'; }
    else { pill.className = 'pill on'; $('onlineTxt').textContent = `${d.n} online · ${d.rooms} rooms`; }
  });
  Net.on('connected', () => { $('onlinePill').className = 'pill on'; $('onlineTxt').textContent = 'online'; });
  Net.on('disconnected', (d) => { toast((d && d.m) || 'Connection lost 😢'); toMenu(); });
  Net.on('err', (d) => { toast(d.m); Net.leave(); });
  Net.on('joined', () => { /* roster follows */ });
  Net.on('roster', (s) => {
    roomSnap = s;
    Game.roster(s);
    if (s.state === 'lobby' && !inMatch && !$('end').classList.contains('active')) showRoom(s);
    else if ($('room').classList.contains('active')) showRoom(s);
  });
  Net.on('matchStart', (info) => {
    inMatch = true;
    show('hud');
    if (Game.isTouch && innerHeight > innerWidth) $('rotateHint').style.display = 'block';
    Game.start(info, Net.id, roomSnap ? roomSnap.hostId : Net.id);
  });
  Net.on('matchEnd', (d) => {
    inMatch = false;
    Game.stop();
    showEnd(d.standings);
  });

  Net.connect();
  show('menu');
})();
