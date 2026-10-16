// Online play settings.
//
// By default NO server is needed: when you create a room, your browser hosts it and
// friends connect to you directly (peer-to-peer over WebRTC, matchmaking via the free
// PeerJS cloud). This is what makes online play work on GitHub Pages.
//
// Optional: if you also deploy server.js (Render / Railway / any Node host), the game
// prefers it automatically when it serves this page. To use it from GitHub Pages, set:
//   window.NEON_SERVER = 'https://your-app.onrender.com';
window.NEON_SERVER = '';

// Optional: your own PeerJS server instead of the free cloud one, e.g.
//   window.NEON_PEER = { host: 'peer.example.com', port: 443, path: '/', secure: true };
