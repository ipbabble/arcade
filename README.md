# Asteroids Game — Modern TypeScript Edition

[![CI](https://github.com/ipbabble/arcade/actions/workflows/ci.yml/badge.svg)](https://github.com/ipbabble/arcade/actions/workflows/ci.yml)

A modern implementation of the classic Asteroids built with TypeScript, Vite, and PixiJS.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:5173
```

Build / preview:

```bash
npm run build
npm run preview
```

## Quality

- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test (Vitest + jsdom): `npm test` (watch) or `npm test -- --run`

### Git hooks

This repo uses `simple-git-hooks` + `lint-staged`:

- pre-commit: runs ESLint (fix) and Prettier on staged files
- pre-push: runs typecheck and the test suite

Hooks are installed automatically via the `prepare` script. If needed, run `npm run prepare`.

## Embed in your website

You can include the built game on any site by loading the compiled JS and providing a container element. The app will render into a div with id `app` if present, otherwise it will attach to `document.body`.

### Option A: via CDN (GitHub Pages or similar)

1. Build and host `dist/` somewhere publicly (e.g., GitHub Pages).

2. On your site, add:

```html
<div id="app"></div>
<link rel="stylesheet" href="https://your.cdn.example/arcade/dist/style.css" />
<script type="module">
  import 'https://your.cdn.example/arcade/dist/assets/index.js';
  // The game auto-initializes and attaches to #app or body
  // If you need to defer until the page is ready:
  // window.addEventListener('DOMContentLoaded', () => import('.../index.js'))
</script>
```

### Option B: embed locally in an existing site

Copy files from `dist/` into your site’s public assets and reference them similarly:

```html
<div id="app"></div>
<link rel="stylesheet" href="/assets/asteroids/style.css" />
<script type="module">
  import '/assets/asteroids/assets/index.js';
  // Auto-initializes
</script>
```

Notes:

- The canvas is square and auto-sizes within viewport bounds.
- If you include a `<div id="app"></div>` where you want it to render, the canvas will be appended inside that element; otherwise it goes to `document.body`.
- No global variables are required; the entry script initializes on import.

## Controls

- WASD or Arrow Keys: rotate/ thrust
- Space: shoot
- P: pause / resume
- R: restart (immediate)
- HUD buttons: Mode toggle (at game start) and Restart (asks to confirm)

## Modes

- Traditional
  - Respawns in the center with a brief invulnerability window
  - No safe-spot search; authentic arcade feel
- Enhanced (default)
  - Delayed, safe respawn that avoids nearby/predicted asteroid/UFO collisions
  - Thrust exhaust puffs (light blue) emit while thrusting
  - UFO spawns later in a level at random intervals

Notes:

- Mode must be chosen at the start of a run. The Mode button disables once play begins and re-enables after Restart.
- Restart via HUD asks for confirmation. Keyboard R restarts immediately.

## Gameplay details

- Ship physics: momentum + friction, time-based rotation for fine control
- Bullets: wrap at screen edges, travel ~75% of screen width so they don’t circle back to the ship from center shots
- Asteroids: randomized shapes, split when large; new level spawns keep a safe distance from the player
- UFO: occasional cross-screen bonus target (250 pts), delayed/randomized spawn per level
- Stars: randomized per-level starfield (stable during play)
- Square view: canvas displayed as a square (internally sized to fit viewport)
- UI: score/lives/level HUD, small controls overlay (auto-hides), top tool row (Mode/Restart) auto-hides

## Project structure

```
src/
├─ main.ts                # PixiJS init & app boot
├─ style.css              # Global styles and HUD
├─ types/game.ts          # Types and interfaces
├─ game/
│  ├─ AsteroidsGame.ts    # Core game loop & orchestration
│  ├─ InputManager.ts     # Keyboard handling
│  ├─ UIManager.ts        # HUD, pause, confirm dialogs, mode UI
│  ├─ CollisionManager.ts # Circle collision checks
│  ├─ entities/
│  │  ├─ Player.ts        # Ship, shooting, thrust exhaust hook
│  │  ├─ Asteroid.ts      # Asteroid shape & motion
│  │  ├─ Bullet.ts        # Bullet motion & wrapping
│  │  └─ Particle.ts      # Explosion particles
│  └─ entities/UFO.ts     # Bonus UFO
```

## Configuration knobs (in code)

- Bullet speed and range (derived lifetime) — `AsteroidsGame` constructor
- Safe respawn timings and prediction horizon — `AsteroidsGame.tryRespawnSafe`
- Exhaust look and cadence — `Player` (emit interval) and `AsteroidsGame.emitExhaust`

## License

MIT
