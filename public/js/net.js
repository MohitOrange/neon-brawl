// Neon Brawl — network layer. Same API for online (Socket.io) and offline (local room with bots).
const Net = (() => {
  let socket = null, mode = null, local = null;
  const handlers = {};
  const fire = (ev, d) => { if (handlers[ev]) handlers[ev](d); };
  const LOBBY_EVENTS = new Set(['online', 'joined', 'err']);

  function connect() {
    if (typeof io === 'undefined') { fire('online', { n: -1 }); return; }
    socket = io(window.NEON_SERVER || undefined, { transports: ['websocket', 'polling'], reconnectionDelay: 2000 });
    socket.on('connect', () => fire('connected'));
    socket.on('connect_error', () => fire('online', { n: -1 }));
    socket.on('disconnect', () => { if (mode === 'online') fire('disconnected'); });
    socket.onAny((ev, d) => { if (mode === 'online' || LOBBY_EVENTS.has(ev)) fire(ev, d); });
  }

  return {
    connect,
    on(ev, cb) { handlers[ev] = cb; },
    get mode() { return mode; },
    get online() { return !!(socket && socket.connected); },
    get id() { return mode === 'offline' ? 'me' : socket && socket.id; },

    online_(action, data, profile) {
      if (!this.online) return false;
      mode = 'online';
      socket.emit('profile', profile);
      socket.emit(action, data);
      return true;
    },

    offline(profile, bots, difficulty) {
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
      else if (mode === 'offline' && local) local.handle('me', ev, d);
    },

    leave() {
      if (mode === 'online' && socket) socket.emit('leave');
      if (local) { local.clearTimers(); local = null; }
      mode = null;
    }
  };
})();
