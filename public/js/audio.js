// Neon Brawl — synthesized sound effects + synthwave music (no audio files needed)
const SFX = (() => {
  let ctx = null, master = null, musicGain = null, noiseBuf = null, musicTimer = null;
  let muted = localStorage.getItem('nb_muted') === '1';

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function noise(dur, freq, q, vol, type = 'lowpass', at = 0, pan = 0, dest) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(f); f.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(dest || master); } else g.connect(dest || master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  function tone(f0, f1, dur, vol, type = 'square', at = 0, dest) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }

  const api = {
    init,
    get muted() { return muted; },
    toggle() {
      init(); muted = !muted; localStorage.setItem('nb_muted', muted ? '1' : '0');
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    shot(w, vol = 1, pan = 0) {
      if (vol < 0.03) return;
      switch (w) {
        case 'pistol': noise(0.12, 2400, 1, 0.5 * vol, 'lowpass', 0, pan); tone(900, 200, 0.08, 0.12 * vol); break;
        case 'smg': noise(0.07, 3000, 1, 0.35 * vol, 'lowpass', 0, pan); tone(1200, 300, 0.05, 0.08 * vol); break;
        case 'shotgun': noise(0.35, 1200, 0.7, 0.8 * vol, 'lowpass', 0, pan); tone(160, 40, 0.25, 0.3 * vol, 'sawtooth'); break;
        case 'sniper': noise(0.5, 4000, 0.5, 0.7 * vol, 'lowpass', 0, pan); tone(2200, 80, 0.4, 0.2 * vol, 'sawtooth'); break;
        case 'rocket': noise(0.6, 600, 0.6, 0.5 * vol, 'bandpass', 0, pan); tone(300, 90, 0.5, 0.18 * vol, 'triangle'); break;
      }
    },
    boom(vol = 1) { noise(0.9, 400, 0.5, 1.1 * vol); tone(120, 30, 0.8, 0.5 * vol, 'sine'); },
    jump() { tone(300, 700, 0.12, 0.08, 'square'); },
    djump() { tone(500, 1100, 0.14, 0.08, 'square'); },
    land() { noise(0.08, 400, 1, 0.12); },
    jet() { noise(0.12, 900, 0.8, 0.07, 'bandpass'); },
    hit() { tone(1600, 1200, 0.05, 0.12, 'square'); },
    hurt() { tone(220, 90, 0.18, 0.18, 'sawtooth'); },
    reload() { tone(500, 500, 0.04, 0.08, 'square'); tone(800, 800, 0.04, 0.08, 'square', 0.18); },
    empty() { tone(1200, 1100, 0.03, 0.06, 'square'); },
    pickup() { tone(600, 600, 0.08, 0.12, 'triangle'); tone(900, 900, 0.08, 0.12, 'triangle', 0.08); tone(1350, 1350, 0.15, 0.12, 'triangle', 0.16); },
    kill() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, 0.12, 'square', i * 0.07)); },
    death() { tone(400, 60, 0.8, 0.2, 'sawtooth'); },
    click() { tone(1000, 1400, 0.05, 0.06, 'triangle'); },

    music(on) {
      init();
      if (!ctx) return;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      if (!on) return;
      // low military march: taiko-style kicks, snare with rolls, minor bass pulse
      const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const bassLine = [38, 38, 41, 36]; // D, D, F, C
      let bar = 0; const beat = 0.15; // 16th note
      const sched = () => {
        if (muted) { bar++; return; }
        const root = bassLine[bar % 4];
        for (let i = 0; i < 16; i++) {
          const at = i * beat;
          if (i === 0 || i === 6 || i === 8 || (bar % 2 && i === 14)) { tone(120, 42, 0.35, 0.9, 'sine', at, musicGain); noise(0.12, 300, 0.8, 0.25, 'lowpass', at, 0, musicGain); }
          if (i === 4 || i === 12) noise(0.18, 1800, 0.9, 0.45, 'bandpass', at, 0, musicGain);
          if (bar % 4 === 3 && i >= 12) noise(0.07, 2200, 1, 0.22 + (i - 12) * 0.05, 'bandpass', at + beat / 2, 0, musicGain);
          if (i % 4 === 2) noise(0.04, 7000, 0.6, 0.06, 'highpass', at, 0, musicGain);
          if (i % 8 === 0) tone(mtof(root), mtof(root) * 0.995, beat * 7, 0.38, 'triangle', at, musicGain);
          if (i === 10) tone(mtof(root + 7), mtof(root + 7), beat * 2, 0.2, 'triangle', at, musicGain);
        }
        bar++;
      };
      sched();
      musicTimer = setInterval(sched, beat * 16 * 1000);
    }
  };
  return api;
})();
