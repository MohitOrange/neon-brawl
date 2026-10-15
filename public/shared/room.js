/*
 * Neon Brawl — shared room logic + map data.
 * Runs on the Node server (online play) AND in the browser (offline play vs bots),
 * so both modes follow exactly the same rules.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- MAP ----
  const MAP = {
    W: 3600,
    H: 1800,
    // solid blocks: collide from every side
    solids: [
      { x: -100, y: 1650, w: 3800, h: 300, kind: 'ground' },
      { x: 0, y: 1150, w: 220, h: 500, kind: 'tower' },
      { x: 3380, y: 1150, w: 220, h: 500, kind: 'tower' },
      { x: 1600, y: 1460, w: 400, h: 190, kind: 'bunker' },
      { x: 700, y: 1580, w: 70, h: 70, kind: 'crate' },
      { x: 770, y: 1580, w: 70, h: 70, kind: 'crate' },
      { x: 735, y: 1510, w: 70, h: 70, kind: 'crate' },
      { x: 2830, y: 1580, w: 70, h: 70, kind: 'crate' },
      { x: 2760, y: 1580, w: 70, h: 70, kind: 'crate' },
      { x: 1120, y: 1590, w: 120, h: 60, kind: 'car' },
      { x: 2360, y: 1590, w: 120, h: 60, kind: 'car' },
      { x: -200, y: -400, w: 200, h: 2400, kind: 'wall' },
      { x: 3600, y: -400, w: 200, h: 2400, kind: 'wall' }
    ],
    // one-way platforms: stand on top, jump through from below, press DOWN to drop
    platforms: [
      { x: 300, y: 1450, w: 380, c: 0 }, { x: 2920, y: 1450, w: 380, c: 0 },
      { x: 900, y: 1310, w: 480, c: 1 }, { x: 2220, y: 1310, w: 480, c: 1 },
      { x: 1560, y: 1170, w: 480, c: 2 },
      { x: 380, y: 1110, w: 400, c: 1 }, { x: 2820, y: 1110, w: 400, c: 1 },
      { x: 1000, y: 960, w: 360, c: 0 }, { x: 2240, y: 960, w: 360, c: 0 },
      { x: 1600, y: 800, w: 400, c: 2 },
      { x: 180, y: 780, w: 330, c: 2 }, { x: 3090, y: 780, w: 330, c: 2 },
      { x: 680, y: 620, w: 300, c: 1 }, { x: 2620, y: 620, w: 300, c: 1 },
      { x: 1660, y: 460, w: 280, c: 0 }
    ],
    spawns: [
      [120, 1150], [3480, 1150], [480, 1450], [3110, 1450], [1140, 1310], [2460, 1310],
      [1800, 1170], [580, 1110], [3020, 1110], [1180, 960], [2420, 960], [1800, 800],
      [345, 780], [3255, 780], [430, 1650], [3170, 1650], [1400, 1650], [2200, 1650]
    ],
    pickups: [
      { type: 'shotgun', x: 1800, y: 1460 },
      { type: 'sniper', x: 1800, y: 460 },
      { type: 'rocket', x: 1800, y: 800 },
      { type: 'smg', x: 1140, y: 1310 },
      { type: 'smg', x: 2460, y: 1310 },
      { type: 'shotgun', x: 580, y: 1110 },
      { type: 'shotgun', x: 3020, y: 1110 },
      { type: 'sniper', x: 345, y: 780 },
      { type: 'rocket', x: 3255, y: 780 },
      { type: 'health', x: 830, y: 620 },
      { type: 'health', x: 2770, y: 620 },
      { type: 'health', x: 1450, y: 1650 },
      { type: 'smg', x: 160, y: 1150 },
      { type: 'smg', x: 3490, y: 1150 }
    ]
  };

  // max damage the server accepts for a single hit (anti-cheat cap)
  const MAX_DMG = { pistol: 30, smg: 18, shotgun: 15, sniper: 115, rocket: 90 };
  const RESPAWN_MS = 3000;
  const PICKUP_RESPAWN_MS = 14000;
  const MAX_PLAYERS = 12;

  const BOT_NAMES = [
    'Glitch', 'Pixel Pam', 'Turbo Tom', 'Neon Nia', 'Zapster', 'Captain Chaos', 'Lil Laser',
    'Disco Dan', 'Mega Maya', 'Boomer Bob', 'Sparky', 'Vortex Vee', 'Rocket Rina', 'Bananaman',
    'Nacho', 'Kiki Kaboom', 'Dr. Wobble', 'Sniper Sue', 'Jelly Jay', 'Ravi Rampage'
  ];
  const SKINS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
  const COLORS = ['#ff2e88', '#00e5ff', '#ffe600', '#7cff4f', '#b14bff', '#ff7b00', '#ffffff', '#ff3b3b'];
  const HAIRS = ['#1b1b1b', '#5a3825', '#e8c26a', '#ff4fa3', '#33d6ff', '#a8ff3e', '#e04040', '#f2f2f2'];

  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const clampStr = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
  const isColor = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

  function sanitizeProfile(p) {
    p = p || {};
    const face = typeof p.face === 'string' && p.face.startsWith('data:image/') && p.face.length < 60000 ? p.face : null;
    return {
      name: clampStr(p.name, 16) || 'Player',
      gender: p.gender === 'female' ? 'female' : 'male',
      skin: isColor(p.skin) ? p.skin : SKINS[1],
      shirt: isColor(p.shirt) ? p.shirt : COLORS[0],
      pants: isColor(p.pants) ? p.pants : '#2b2d42',
      hair: isColor(p.hair) ? p.hair : HAIRS[0],
      bigHead: p.bigHead !== false,
      face
    };
  }

  function randomBotProfile(used) {
    let name = rnd(BOT_NAMES);
    for (let i = 0; i < 20 && used.has(name); i++) name = rnd(BOT_NAMES);
    return {
      name, gender: Math.random() < 0.5 ? 'male' : 'female', skin: rnd(SKINS), shirt: rnd(COLORS),
      pants: rnd(['#2b2d42', '#1d3557', '#3a0ca3', '#222', '#14532d', '#5b2333']), hair: rnd(HAIRS),
      bigHead: false, face: null
    };
  }

  // -------------------------------------------------------------- ROOM ----
  // out(target, event, data): target = player id, null (everyone) or {except: id}
  class Room {
    constructor(code, opts, out) {
      this.code = code;
      this.isPublic = !!opts.isPublic;
      this.autoFill = !!opts.autoFill; // quick-match rooms keep themselves full of bots
      this.out = out;
      this.players = new Map();
      this.hostId = null;
      this.state = 'lobby';
      this.settings = { killLimit: 20, time: 300, difficulty: 'normal', botFill: 6 };
      this.pickups = MAP.pickups.map(() => 0);
      this.botSeq = 0;
      this.timers = new Set();
      this.endsAt = 0;
    }
    later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
    clearTimers() { for (const t of this.timers) clearTimeout(t); this.timers.clear(); }

    pub(p) {
      return { id: p.id, isBot: p.isBot, kills: p.kills, deaths: p.deaths, hp: p.hp, alive: p.alive, ...p.profile };
    }
    roster() { return [...this.players.values()].map((p) => this.pub(p)); }
    humans() { return [...this.players.values()].filter((p) => !p.isBot); }
    bots() { return [...this.players.values()].filter((p) => p.isBot); }
    snapshot() {
      return { code: this.code, hostId: this.hostId, state: this.state, settings: this.settings,
        isPublic: this.isPublic, autoFill: this.autoFill, endsAt: this.endsAt, players: this.roster() };
    }
    sendRoster() { this.out(null, 'roster', this.snapshot()); }

    addPlayer(id, profile) {
      if (this.players.size >= MAX_PLAYERS) {
        const bot = this.bots()[0];
        if (bot) this.dropBot(bot.id); else return false;
      }
      const p = { id, isBot: false, profile: sanitizeProfile(profile), kills: 0, deaths: 0, hp: 100, alive: false };
      this.players.set(id, p);
      if (!this.hostId) this.hostId = id;
      if (this.autoFill) this.fillBots();
      this.sendRoster();
      if (this.state === 'playing') {
        this.out(id, 'matchStart', this.matchInfo());
        this.later(() => this.respawn(id), 600);
      }
      return true;
    }

    removePlayer(id) {
      if (!this.players.delete(id)) return;
      if (this.hostId === id) {
        const h = this.humans()[0];
        this.hostId = h ? h.id : null;
      }
      if (!this.hostId) { this.clearTimers(); return 'empty'; }
      if (this.autoFill) this.fillBots();
      this.out(null, 'left', { id });
      this.out(null, 'host', { id: this.hostId });
      this.sendRoster();
    }

    fillBots() {
      const want = Math.max(0, Math.min(MAX_PLAYERS, this.settings.botFill) - this.humans().length);
      while (this.bots().length > want) this.dropBot(this.bots()[0].id, true);
      while (this.bots().length < want) this.makeBot(true);
    }
    makeBot(silent) {
      if (this.players.size >= MAX_PLAYERS) return;
      const used = new Set([...this.players.values()].map((p) => p.profile.name));
      const id = 'bot' + (++this.botSeq) + '_' + this.code;
      const p = { id, isBot: true, profile: randomBotProfile(used), kills: 0, deaths: 0, hp: 100, alive: false };
      this.players.set(id, p);
      if (this.state === 'playing') this.later(() => this.respawn(id), 400);
      if (!silent) this.sendRoster();
    }
    dropBot(id, silent) {
      if (!this.players.delete(id)) return;
      this.out(null, 'left', { id });
      if (!silent) this.sendRoster();
    }

    matchInfo() { return { left: Math.max(0, this.endsAt - Date.now()), settings: this.settings, players: this.roster(),
      pickups: this.pickups.map((t) => Math.max(0, t - Date.now())) }; }

    start(by) {
      if (by !== this.hostId || this.state === 'playing') return;
      this.clearTimers();
      this.state = 'playing';
      this.pickups = MAP.pickups.map(() => 0);
      this.endsAt = Date.now() + this.settings.time * 1000;
      const order = MAP.spawns.map((_, i) => i).sort(() => Math.random() - 0.5);
      let k = 0;
      for (const p of this.players.values()) { p.kills = 0; p.deaths = 0; p.hp = 100; p.alive = true; p.spawn = order[k++ % order.length]; }
      const info = this.matchInfo();
      info.spawns = {};
      for (const p of this.players.values()) info.spawns[p.id] = p.spawn;
      this.out(null, 'matchStart', info);
      this.later(() => this.end(), this.settings.time * 1000);
    }

    end() {
      if (this.state !== 'playing') return;
      this.clearTimers();
      this.state = 'lobby';
      const standings = this.roster().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
      this.out(null, 'matchEnd', { standings });
      this.sendRoster();
      if (this.autoFill) this.later(() => { if (this.hostId) this.start(this.hostId); }, 12000);
    }

    hit(from, d) {
      if (this.state !== 'playing' || !d) return;
      const aid = d.a || from;
      const ap = this.players.get(aid);
      if (!ap) return;
      if (aid !== from && !(ap.isBot && from === this.hostId)) return; // only host may report bot hits
      const tp = this.players.get(d.t);
      if (!tp || !tp.alive) return;
      let dmg = Math.min(Number(d.dmg) || 0, MAX_DMG[d.w] || 20);
      if (!(dmg > 0)) return;
      if (d.t === aid) dmg *= 0.5; // self-damage from rockets is halved
      dmg = Math.round(dmg);
      tp.hp -= dmg;
      this.out(null, 'dmg', { t: d.t, a: aid, dmg, hp: tp.hp, w: d.w, hs: !!d.hs });
      if (tp.hp <= 0) {
        tp.alive = false; tp.hp = 0; tp.deaths++;
        if (aid !== d.t) ap.kills++; else ap.kills = Math.max(0, ap.kills - 1);
        this.out(null, 'kill', { k: aid, v: d.t, w: d.w, hs: !!d.hs, kk: ap.kills });
        if (ap.kills >= this.settings.killLimit) this.later(() => this.end(), 1800);
        else this.later(() => this.respawn(d.t), RESPAWN_MS);
      }
    }

    respawn(id) {
      const p = this.players.get(id);
      if (!p || this.state !== 'playing') return;
      p.hp = 100; p.alive = true;
      this.out(null, 'respawn', { id, s: Math.floor(Math.random() * MAP.spawns.length) });
    }

    pick(from, d) {
      if (this.state !== 'playing' || !d) return;
      const i = d.i | 0;
      const def = MAP.pickups[i];
      if (!def || this.pickups[i] > Date.now()) return;
      const by = d.by || from;
      const p = this.players.get(by);
      if (!p || !p.alive || (by !== from && !(p.isBot && from === this.hostId))) return;
      this.pickups[i] = Date.now() + PICKUP_RESPAWN_MS;
      if (def.type === 'health') p.hp = Math.min(100, p.hp + 50);
      this.out(null, 'picked', { i, by, ms: PICKUP_RESPAWN_MS, hp: p.hp });
    }

    setSettings(by, s) {
      if (by !== this.hostId || !s) return;
      const t = Number(s.time), k = Number(s.killLimit), b = Number(s.botFill);
      if ([120, 180, 300, 600].includes(t)) this.settings.time = t;
      if ([10, 20, 30, 50].includes(k)) this.settings.killLimit = k;
      if (['easy', 'normal', 'hard'].includes(s.difficulty)) this.settings.difficulty = s.difficulty;
      if (b >= 0 && b <= MAX_PLAYERS) this.settings.botFill = b;
      this.sendRoster();
    }

    // single entry point for every client → room message
    handle(from, ev, d) {
      switch (ev) {
        case 'st': if (this.state === 'playing') this.out({ except: from }, 'st', Object.assign({}, d, { id: from })); break;
        case 'bots': if (from === this.hostId && Array.isArray(d)) this.out({ except: from }, 'bots', d); break;
        case 'shot': if (this.state === 'playing' && d) {
          const id = d.id && from === this.hostId && this.players.get(d.id)?.isBot ? d.id : from;
          this.out({ except: from }, 'shot', Object.assign({}, d, { id }));
        } break;
        case 'hit': this.hit(from, d); break;
        case 'pick': this.pick(from, d); break;
        case 'start': this.start(from); break;
        case 'addBot': if (from === this.hostId) this.makeBot(); break;
        case 'removeBot': if (from === this.hostId) { const b = this.bots().pop(); if (b) this.dropBot(b.id); } break;
        case 'settings': this.setSettings(from, d); break;
        case 'emote': this.out(null, 'emote', { id: from, e: clampStr(d && d.e, 4) }); break;
        case 'chat': { const p = this.players.get(from); const m = clampStr(d && d.m, 80);
          if (p && m) this.out(null, 'chat', { id: from, name: p.profile.name, m }); } break;
      }
    }
  }

  const api = { MAP, Room, sanitizeProfile, MAX_PLAYERS, SKINS, COLORS, HAIRS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NB = api;
})(typeof self !== 'undefined' ? self : this);
