// Neon Brawl — network layer. One API, three transports:
//   'online'  — a Neon Brawl Node/Socket.io server (when one is reachable)
//   'p2p'     — no server needed: the room creator's browser hosts the room and friends
//               connect to it directly over WebRTC (PeerJS). Works from GitHub Pages.
//   'offline' — local practice room with bots
const Net = (() => {
  let socket = null, mode = null, local = null;
  const handlers = {};
  const fire = (ev, d) => { if (handlers[ev]) handlers[ev](d); };
  const LOBBY_EVENTS = new Set(['online', 'joined', 'err']);

  // ------------------------------------------------------ socket.io --
  function connect() {
    const p2pOk = typeof Peer !== 'undefined';
    if (typeof io === 'undefined') { fire('online', { n: -1, p2p: p2pOk }); return; }
    socket = io(window.NEON_SERVER || undefined, { transports: ['websocket', 'polling'], reconnectionDelay: 2000, reconnectionAttempts: 3 });
    socket.on('connect', () => fire('connected'));
    socket.on('connect_error', () => fire('online', { n: -1, p2p: p2pOk }));
    socket.on('disconnect', () => { if (mode === 'online') fire('disconnected'); });
    socket.onAny((ev, d) => { if (mode === 'online' || LOBBY_EVENTS.has(ev)) fire(ev, d); });
  }

  // ----------------------------------------------------- peer-to-peer --
  const PREFIX = 'nbrawl-v1-';
  const peerOpts = () => Object.assign({ debug: 0 }, window.NEON_PEER || {});
  let peer = null, room = null, conns = new Map(), hostConn = null, myId = null, isHost = false, joinTimer = null, quickTry = 0, quickHops = 0;

  function resetP2P() {
    clearTimeout(joinTimer); joinTimer = null;
    if (room) { room.clearTimers(); room = null; }
    for (const c of conns.values()) { try { c.close(); } catch (e) { /* ignore */ } }
    conns = new Map();
    if (hostConn) { const c = hostConn; hostConn = null; try { c.close(); } catch (e) { /* ignore */ } }
    if (peer) { const p = peer; peer = null; try { p.destroy(); } catch (e) { /* ignore */ } }
    isHost = false; myId = null;
  }
  const send = (c, ev, d) => { if (c && c.open) { try { c.send([ev, d]); } catch (e) { /* ignore */ } } };
  const netErr = (err) => {
    const t = err && err.type;
    if (t === 'browser-incompatible') return 'This browser does not support online play';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Can\'t reach the matchmaking service — check your internet';
    return 'Connection problem — please try again';
  };
  const randCode = () => { const A = 'ABCDEFGHJKLMNQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)]; return c; };

  // the room creator: runs the authoritative room in this browser and relays to every friend
  function hostRoom(code, opts, profile, startNow, onTaken) {
    resetP2P();
    const p = peer = new Peer(PREFIX + code, peerOpts());
    p.on('open', (id) => {
      if (p !== peer) return;
      myId = id; isHost = true; mode = 'p2p';
      room = new NB.Room(code, opts, (target, ev, d) => {
        const toMe = () => queueMicrotask(() => { if (mode === 'p2p' && isHost) fire(ev, d); });
        if (target === null) { toMe(); for (const c of conns.values()) send(c, ev, d); }
        else if (typeof target === 'string') { if (target === myId) toMe(); else send(conns.get(target), ev, d); }
        else if (target && target.except) { if (target.except !== myId) toMe(); for (const [cid, c] of conns) if (cid !== target.except) send(c, ev, d); }
      });
      room.addPlayer(myId, profile);
      fire('joined', { code, you: myId });
      if (startNow) room.start(myId);
    });
    p.on('connection', (c) => {
      c.on('data', (msg) => {
        if (!room || !Array.isArray(msg)) return;
        const [ev, d] = msg;
        if (ev === 'hello') {
          if (conns.has(c.peer)) return;
          conns.set(c.peer, c);
          if (!room.addPlayer(c.peer, d)) { conns.delete(c.peer); send(c, 'err', { m: 'Room is full', full: true }); setTimeout(() => c.close(), 400); return; }
          send(c, 'joined', { code, you: c.peer });
        } else if (conns.has(c.peer)) room.handle(c.peer, ev, d);
      });
      const gone = () => { if (conns.delete(c.peer) && room) room.removePlayer(c.peer); };
      c.on('close', gone); c.on('error', gone);
    });
    p.on('disconnected', () => { if (p === peer && !p.destroyed) setTimeout(() => { try { p.reconnect(); } catch (e) { /* ignore */ } }, 1500); });
    p.on('error', (err) => {
      if (p !== peer) return;
      if (err.type === 'unavailable-id') { resetP2P(); onTaken(); return; }
      if (room) return; // matchmaking hiccup after the room is up: friends already connected keep playing
      resetP2P(); mode = null; fire('err', { m: netErr(err) });
    });
  }

  // a friend: connects straight to the host's browser
  function joinRoom(code, profile, onMissing) {
    resetP2P();
    const p = peer = new Peer(peerOpts());
    const fail = (m) => { if (p !== peer) return; resetP2P(); mode = null; fire('err', { m }); };
    p.on('open', (id) => {
      if (p !== peer) return;
      myId = id;
      const c = hostConn = p.connect(PREFIX + code, { reliable: true });
      joinTimer = setTimeout(() => fail('Could not reach the host — their network may block direct connections. Try again or use another Wi-Fi / mobile data.'), 15000);
      c.on('open', () => { clearTimeout(joinTimer); mode = 'p2p'; send(c, 'hello', profile); });
      c.on('data', (msg) => {
        if (!Array.isArray(msg)) return;
        const [ev, d] = msg;
        if (ev === 'err' && d && d.full && quickTry) { resetP2P(); quick(profile, quickTry + 1); return; }
        if (ev === 'err') { fail(d.m); return; }
        if (ev === 'joined') { quickTry = 0; quickHops = 0; }
        fire(ev, d);
      });
      c.on('close', () => { if (hostConn === c && mode === 'p2p') { resetP2P(); mode = null; fire('disconnected', { m: 'The host left the room' }); } });
    });
    p.on('error', (err) => {
      if (p !== peer) return;
      if (err.type === 'peer-unavailable') { if (onMissing) { resetP2P(); onMissing(); } else fail('Room not found — check the code'); return; }
      fail(netErr(err));
    });
  }

  // quick match: join public room 1; if it doesn't exist, host it; if full, try the next one
  function quick(profile, i = 1) {
    if (i > 6 || ++quickHops > 12) { quickTry = 0; fire('err', { m: 'All public rooms are full — create a room instead' }); return; }
    quickTry = i;
    const code = 'PUB0' + i;
    joinRoom(code, profile, () => hostRoom(code, { isPublic: true, autoFill: true }, profile, true, () => quick(profile, i)));
  }

  // ------------------------------------------------------------ api --
  return {
    connect,
    on(ev, cb) { handlers[ev] = cb; },
    get mode() { return mode; },
    get networked() { return mode === 'online' || mode === 'p2p'; },
    get online() { return !!(socket && socket.connected); },
    get canPlayOnline() { return this.online || typeof Peer !== 'undefined'; },
    get transport() { return this.online ? 'server' : typeof Peer !== 'undefined' ? 'p2p' : 'none'; },
    get id() { return mode === 'offline' ? 'me' : mode === 'p2p' ? myId : socket && socket.id; },

    // action: 'quick' | 'create' | 'join'
    online_(action, data, profile) {
      if (this.online) {
        mode = 'online';
        socket.emit('profile', profile);
        socket.emit(action, data);
        return true;
      }
      if (typeof Peer === 'undefined') return false;
      quickTry = 0; quickHops = 0;
      if (action === 'quick') quick(profile);
      else if (action === 'create') { const go = () => hostRoom(randCode(), { isPublic: false }, profile, false, go); go(); }
      else if (action === 'join') joinRoom(String(data.code).toUpperCase().trim(), profile, null);
      return true;
    },

    offline(profile, bots, difficulty) {
      resetP2P();
      mode = 'offline';
      local = new NB.Room('SOLO', { isPublic: false }, (target, ev, d) => {
        if (target === null || target === 'me') queueMicrotask(() => { if (mode === 'offline') fire(ev, d); });
      });
      local.settings.difficulty = difficulty;
      local.settings.time = 300;
      local.settings.killLimit = 25;
      local.addPlayer('me', profile);
      for (let i = 0; i < bots; i++) local.makeBot(true);
      queueMicrotask(() => { fire('joined', { code: 'SOLO', you: 'me' }); local.start('me'); });
    },

    emit(ev, d) {
      if (mode === 'online' && socket) socket.emit(ev, d);
      else if (mode === 'p2p') { if (isHost && room) room.handle(myId, ev, d); else send(hostConn, ev, d); }
      else if (mode === 'offline' && local) local.handle('me', ev, d);
    },

    leave() {
      if (mode === 'online' && socket) socket.emit('leave');
      if (local) { local.clearTimers(); local = null; }
      mode = null; quickTry = 0;
      resetP2P();
    }
  };
})();
