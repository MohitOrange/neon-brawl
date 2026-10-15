# 💥 NEON BRAWL

**A colourful 2D online multiplayer arena shooter for the web — desktop, mobile and tablet.**
Put **your own face** on your fighter, pick male or female, choose your colours and battle friends or bots in a neon synthwave city.

![made with](https://img.shields.io/badge/HTML5-Canvas-ff2e88) ![socket.io](https://img.shields.io/badge/Socket.io-multiplayer-00e5ff) ![node](https://img.shields.io/badge/Node-%3E%3D18-7cff4f)

## ✨ Features

- **Online multiplayer** — Quick Match (auto-fills with bots, new players replace bots), or private rooms with a 5-letter code / invite link. Up to 12 fighters per room.
- **Offline vs Bots** — 1–11 bots, Easy / Normal / Hard. Works with no server at all.
- **📸 Your face in the game** — upload a photo; it's cropped and put on your fighter. Big-Head mode makes it extra funny, and your head pops off and bounces when you're eliminated.
- **Male & female fighters** — skin, hair and outfit colours, custom name.
- **Full movement** — walk, run, crouch, jump, double-jump, **jetpack flying**, drop through platforms, rocket-jumping.
- **5 weapons** — Pistol, SMG, Shotgun, Sniper, Rocket Launcher. Guns are held and aimed 360°, with reloads, ammo, recoil and headshots.
- **Pickups** — weapon and health pickups that respawn.
- **Juicy effects** — muzzle flashes, tracers, shell casings, explosions, confetti, screen shake, damage numbers, kill streaks (DOUBLE KILL!), synth sound effects and synthwave music.
- **Neon environment** — parallax city skyline, striped sunset, hover platforms, palm trees, street lamps, neon signs, cars and crates.
- **HUD** — health, jet fuel, ammo, timer, kill feed, minimap, scoreboard, chat and emotes.
- **Responsive** — dual virtual joysticks + buttons on phones & tablets, mouse + keyboard on desktop.
- **Server-authoritative damage** — the server owns health, kills, respawns and pickups, and caps damage per weapon.

## 🎮 Controls

| Action | Desktop | Touch |
|---|---|---|
| Move | `A` `D` | Left stick |
| Run | `Shift` | Push stick all the way |
| Jump / double jump | `W` / `Space` | ⤒ button or stick up |
| Jetpack | `F` / right mouse | 🚀 button (hold) |
| Crouch / drop through | `S` | Stick down |
| Aim & shoot | Mouse + left click | Right stick (aim, push further to fire) |
| Reload / swap gun | `R` / `Q` or wheel | R / ⇄ |
| Scoreboard | `Tab` | 🏆 |
| Chat / emotes | `T` / `1`–`6` | 😂 |

## 🚀 Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

Open the page in two browser tabs (or on your phone on the same Wi-Fi via `http://<your-pc-ip>:3000`) to play together.

## 🌍 Deploy (free)

GitHub Pages only serves static files, so the **multiplayer server must run on a Node host**. Two options:

### Option A — everything on Render (easiest)
1. Push this repo to GitHub.
2. On [render.com](https://render.com) → **New → Blueprint** → pick the repo (it reads `render.yaml`). Or **New → Web Service** with build `npm install` and start `npm start`.
3. Open the Render URL — online and offline modes both work.

(Railway, Fly.io, Glitch or any VPS work the same way: `npm install && npm start`, `PORT` is read from the environment.)

### Option B — game on GitHub Pages + server on Render
1. Deploy the server as in Option A.
2. Edit `public/config.js` and set `window.NEON_SERVER = 'https://your-app.onrender.com';`
3. In GitHub: **Settings → Pages → Source: GitHub Actions**. The included workflow `.github/workflows/pages.yml` publishes the `public/` folder on every push to `main`.

Without a server URL, the GitHub Pages version still runs **Play vs Bots** offline.

## 🗂 Project structure

```
server.js               Express + Socket.io server, room matchmaking
public/
  index.html            screens: menu, room lobby, HUD, end screen
  config.js             optional external server URL
  css/style.css         neon UI, responsive + touch layout
  shared/room.js        map data + room rules (used by server AND offline mode)
  js/net.js             online/offline network layer
  js/game.js            physics, guns, bots AI, effects, rendering, input, HUD
  js/character.js       weapons + procedural male/female fighters with face photos
  js/world.js           synthwave sky, parallax city, platforms and props
  js/audio.js           synthesized SFX + music (no audio files)
  js/ui.js              character creator, lobby, end screen
```

## 🔒 Privacy note
Face photos are resized to a small 128×128 image in the browser, kept in your browser's local storage, and only sent to the players in your current room. Nothing is stored on the server.

## License
MIT
