// Neon Brawl — multiplayer server (Express static hosting + Socket.io rooms)
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Room, sanitizeProfile } = require('./public/shared/room.js');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // lets a GitHub Pages front-end talk to this server
  maxHttpBufferSize: 1e5,
  pingInterval: 10000
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/health', (_, res) => res.json({ ok: true, online: io.engine.clientsCount, rooms: rooms.size }));

const rooms = new Map();

function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}

function createRoom(opts) {
  const code = makeCode();
  const room = new Room(code, opts, (target, ev, data) => {
    if (target === null) io.to(code).emit(ev, data);
    else if (typeof target === 'string') io.to(target).emit(ev, data);
    else if (target && target.except) io.to(code).except(target.except).emit(ev, data);
  });
  rooms.set(code, room);
  return room;
}

function leave(socket) {
  const code = socket.data.room;
  if (!code) return;
  socket.leave(code);
  socket.data.room = null;
  const room = rooms.get(code);
  if (room && room.removePlayer(socket.id) === 'empty') rooms.delete(code);
}

function enter(socket, room) {
  leave(socket);
  socket.join(room.code);
  socket.data.room = room.code;
  if (!room.addPlayer(socket.id, socket.data.profile)) {
    socket.leave(room.code); socket.data.room = null;
    socket.emit('err', { m: 'Room is full' });
    return;
  }
  socket.emit('joined', { code: room.code, you: socket.id });
}

io.on('connection', (socket) => {
  socket.data.profile = sanitizeProfile({});

  socket.on('profile', (p) => { socket.data.profile = sanitizeProfile(p); });

  socket.on('quick', () => {
    let best = null;
    for (const r of rooms.values()) {
      if (r.isPublic && r.humans().length < 8 && (!best || r.humans().length > best.humans().length)) best = r;
    }
    if (!best) {
      best = createRoom({ isPublic: true, autoFill: true });
      enter(socket, best);
      best.start(socket.id);
      return;
    }
    enter(socket, best);
  });

  socket.on('create', () => enter(socket, createRoom({ isPublic: false })));

  socket.on('join', (d) => {
    const room = rooms.get(String((d && d.code) || '').toUpperCase().trim());
    if (!room) return socket.emit('err', { m: 'Room not found' });
    enter(socket, room);
  });

  socket.on('leave', () => leave(socket));
  socket.on('disconnect', () => leave(socket));

  for (const ev of ['st', 'bots', 'shot', 'hit', 'pick', 'start', 'addBot', 'removeBot', 'settings', 'emote', 'chat']) {
    socket.on(ev, (d) => {
      const room = rooms.get(socket.data.room);
      if (room) room.handle(socket.id, ev, d);
    });
  }
});

setInterval(() => io.emit('online', { n: io.engine.clientsCount, rooms: rooms.size }), 4000);

server.listen(PORT, () => console.log(`Neon Brawl running on http://localhost:${PORT}`));
