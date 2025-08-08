import * as PIXI from 'pixi.js';
import { Player } from './entities/Player';
import { Asteroid } from './entities/Asteroid';
import { Bullet } from './entities/Bullet';
import { Particle } from './entities/Particle';
import { GameState, GameConfig, GameStats, GameMode } from '../types/game';
import { InputManager } from './InputManager';
import { UIManager } from './UIManager';
import { CollisionManager } from './CollisionManager';
import { UFO } from './entities/UFO';
import { AudioManager } from './AudioManager';

export class AsteroidsGame {
  private app: PIXI.Application;
  private gameState: GameState = 'playing';
  private stats: GameStats = { score: 0, lives: 3, level: 1 };
  private config: GameConfig;
  private mode: GameMode = 'enhanced'; // default to enhanced; could be toggled via UI later
  
  // Game objects
  private player: Player;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private ufos: UFO[] = [];
  
  // Managers
  private inputManager: InputManager;
  private uiManager: UIManager;
  private collisionManager: CollisionManager;
  private audio: AudioManager;
  
  // Game loop
  private lastTime = 0; // not used anymore but kept for minimal diff
  private gameContainer: PIXI.Container;
  private backgroundContainer: PIXI.Container;
  private shootCooldown = 0;

  // Timers for UFO spawns
  private ufoSpawnTimeoutId: number | null = null;
  private ufoSpawnIntervalId: number | null = null;

  // Respawn / invulnerability
  private playerInactive = false;
  private respawnMsRemaining = 0;
  private playerInvulnMsRemaining = 0;
  private blinkAccumMs = 0;

  // Bonus life tracking
  private nextBonusAt = 100000;

  constructor(app: PIXI.Application) {
    this.app = app;
    const width = app.screen.width;
    const height = app.screen.height;
    const bulletSpeed = 500; // px/s
    const desiredTravel = width * 0.75; // ~75% of screen width
    const bulletLifetime = Math.floor((desiredTravel / bulletSpeed) * 1000); // ms

    this.config = {
      width,
      height,
      playerSpeed: 5,
      bulletSpeed,
      asteroidSpeed: 100,
      maxBullets: 10,
      bulletLifetime,
    };

    this.audio = new AudioManager();
    this.setupGame();
    this.start();
  }

  public setMode(mode: GameMode) {
    this.mode = mode;
  }

  private setupGame(): void {
    // Create containers
    this.gameContainer = new PIXI.Container();
    this.backgroundContainer = new PIXI.Container();
    
    this.app.stage.addChild(this.backgroundContainer);
    this.app.stage.addChild(this.gameContainer);

    // Initialize managers
    this.inputManager = new InputManager();
    this.uiManager = new UIManager(this.stats);
    this.uiManager.bindHandlers({
      onRestart: () => this.restart(),
      onToggleMode: () => {
        // Only allow switching if not yet playing (before first input) or immediately after restart
        if (this.stats.score === 0 && this.asteroids.length > 0) {
          this.toggleMode();
        }
      },
    });
    this.uiManager.setModeButtonEnabled(true);
    this.collisionManager = new CollisionManager();

    // Create player
    this.player = new Player(
      this.config.width / 2,
      this.config.height / 2,
      this.config
    );
    // Attach exhaust hook initially based on mode
    this.player.onExhaust = this.mode === 'enhanced' ? (x, y) => this.emitExhaust(x, y) : undefined;
    this.gameContainer.addChild(this.player.sprite);

    // Spawn initial asteroids
    this.spawnAsteroids();

    // Schedule UFO spawns for this level
    this.scheduleUfoTimersForLevel();

    // Setup input handlers
    this.setupInputHandlers();
  }

  private toggleMode(): void {
    this.mode = this.mode === 'enhanced' ? 'traditional' : 'enhanced';
    this.uiManager.updateModeLabel(this.mode);
  }

  private maybeSpawnUFO(): void {
    // Small chance growing with level
    const chance = Math.min(0.2 + this.stats.level * 0.05, 0.6);
    if (Math.random() < chance) {
      const fromLeft = Math.random() < 0.5;
      const y = 60 + Math.random() * (this.config.height - 120);
      const ufo = new UFO(fromLeft, y, this.config);
      this.ufos.push(ufo);
      this.gameContainer.addChild(ufo.sprite);
      // ensure siren starts
      this.audio.startUfo();
    }
  }

  private scheduleUfoTimersForLevel(): void {
    this.clearUfoTimers();
    // First UFO appears later into the level (e.g., 8–14s), slightly earlier at higher levels
    const baseDelay = 8000; // ms
    const spread = 6000; // ms
    const levelAccel = Math.min(this.stats.level * 500, 3000); // reduce delay up to 3s
    const initialDelay = Math.max(3000, baseDelay + Math.random() * spread - levelAccel);

    this.ufoSpawnTimeoutId = window.setTimeout(() => {
      // Spawn one (maybe) and then set a recurring random interval
      this.maybeSpawnUFO();
      const minGap = 12000;
      const maxGap = 20000;
      this.ufoSpawnIntervalId = window.setInterval(() => {
        // Avoid piling up too many UFOs at once
        if (this.ufos.length === 0) {
          this.maybeSpawnUFO();
        }
      }, minGap + Math.random() * (maxGap - minGap));
    }, initialDelay);
  }

  private clearUfoTimers(): void {
    if (this.ufoSpawnTimeoutId !== null) {
      clearTimeout(this.ufoSpawnTimeoutId);
      this.ufoSpawnTimeoutId = null;
    }
    if (this.ufoSpawnIntervalId !== null) {
      clearInterval(this.ufoSpawnIntervalId);
      this.ufoSpawnIntervalId = null;
    }
  }

  private setupInputHandlers(): void {
    this.inputManager.onPause = () => {
      this.togglePause();
    };

    this.inputManager.onRestart = () => {
      // Keyboard 'R' remains immediate restart
      this.restart();
    };

    // Resume audio context on first key interaction
    document.addEventListener('keydown', () => this.audio.resume(), { once: true });
    document.addEventListener('mousedown', () => this.audio.resume(), { once: true });
    document.addEventListener('touchstart', () => this.audio.resume(), { once: true });
  }

  private start(): void {
    this.app.ticker.add(this.gameLoop.bind(this));
  }

  private gameLoop(deltaTime: number): void {
    // Pixi ticker provides delta as a multiplier where 1 ~= 16.67ms (60fps)
    const dtMs = deltaTime * (1000 / 60);

    if (this.gameState === 'playing') {
      this.update(dtMs);
    }

    this.render();
  }

  private update(deltaTime: number): void {
    // After first update, lock mode button
    this.uiManager.setModeButtonEnabled(false);

    // Sync thrust audio
    const thrusting = !!(this.inputManager.keys['ArrowUp'] || this.inputManager.keys['KeyW']);
    this.audio.setThrustActive(!this.playerInactive && thrusting);

    // Handle respawn timer and invulnerability
    if (this.playerInactive) {
      this.respawnMsRemaining -= deltaTime;
      if (this.respawnMsRemaining <= 0) {
        if (this.tryRespawnSafe()) {
          this.playerInactive = false;
          this.playerInvulnMsRemaining = this.mode === 'traditional' ? 1500 : 1800;
          this.blinkAccumMs = 0;
          this.player.sprite.visible = true;
          this.player.sprite.alpha = 1;
          // Attach exhaust hook in enhanced mode
          this.player.onExhaust = this.mode === 'enhanced' ? (x, y) => this.emitExhaust(x, y) : undefined;
        } else {
          // Retry shortly (enhanced only)
          this.respawnMsRemaining = this.mode === 'traditional' ? 300 : 300;
        }
      }
    } else {
      if (this.playerInvulnMsRemaining > 0) {
        this.playerInvulnMsRemaining -= deltaTime;
        this.blinkAccumMs += deltaTime;
        if (this.blinkAccumMs > 120) {
          this.player.sprite.visible = !this.player.sprite.visible;
          this.blinkAccumMs = 0;
        }
        if (this.playerInvulnMsRemaining <= 0) {
          this.player.sprite.visible = true;
          this.player.sprite.alpha = 1;
        }
      }
    }

    // Update player only when active
    if (!this.playerInactive) {
      this.player.update(deltaTime, this.inputManager.keys, this.config);
    }

    // Handle shooting
    if (
      this.inputManager.keys['Space'] &&
      this.gameState === 'playing' &&
      this.bullets.length < this.config.maxBullets &&
      this.shootCooldown <= 0
    ) {
      this.shoot();
      this.shootCooldown = 150; // slightly faster firing cadence
    }

    // Update shoot cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    // Update bullets
    this.bullets.forEach((bullet, index) => {
      bullet.update(deltaTime, this.config.width, this.config.height);
      if (bullet.isOffscreen(this.config.width, this.config.height)) {
        this.removeBullet(index);
      }
    });

    // Update asteroids
    this.asteroids.forEach((asteroid) => {
      asteroid.update(deltaTime, this.config.width, this.config.height);
    });

    // Update UFOs
    this.ufos.forEach((ufo, i) => {
      ufo.update(deltaTime);
      if (ufo.isOffscreen()) {
        this.gameContainer.removeChild(ufo.sprite);
        this.ufos.splice(i, 1);
      }
    });
    if (this.ufos.length > 0) {
      this.audio.startUfo();
    } else {
      this.audio.stopUfo();
    }

    // Update particles
    this.particles.forEach((particle, index) => {
      particle.update(deltaTime);
      if (particle.life <= 0) {
        this.removeParticle(index);
      }
    });

    // Check collisions
    this.checkCollisions();

    // Check if all asteroids are destroyed
    if (this.asteroids.length === 0) {
      this.nextLevel();
    }
  }

  private tryRespawnSafe(): boolean {
    if (this.mode === 'traditional') {
      // Center with short invulnerability only
      this.player.reset(this.config.width / 2, this.config.height / 2);
      this.player.vx = 0;
      this.player.vy = 0;
      return true;
    }
    // Enhanced safe respawn (randomized safe spots with prediction)
    const candidates: { x: number; y: number }[] = [
      { x: this.config.width / 2, y: this.config.height / 2 },
    ];
    for (let i = 0; i < 20; i++) {
      candidates.push({
        x: 60 + Math.random() * (this.config.width - 120),
        y: 60 + Math.random() * (this.config.height - 120),
      });
    }
    for (const c of candidates) {
      if (this.isSafeSpawnPosition(c.x, c.y)) {
        this.player.reset(c.x, c.y);
        this.player.vx = 0;
        this.player.vy = 0;
        return true;
      }
    }
    return false;
  }

  private isSafeSpawnPosition(x: number, y: number): boolean {
    const safeRadius = 120; // pixels around spawn point
    const predictHorizon = 2000; // ms to look ahead
    const steps = 4; // check in chunks across the horizon

    const checkDistance = (ax: number, ay: number): boolean => {
      const dx = ax - x;
      const dy = ay - y;
      return Math.sqrt(dx * dx + dy * dy) > safeRadius;
    };

    // current positions
    for (const a of this.asteroids) {
      if (!checkDistance(a.x, a.y)) return false;
    }
    for (const u of this.ufos) {
      if (!checkDistance(u.x, u.y)) return false;
    }

    // predicted positions
    for (let i = 1; i <= steps; i++) {
      const t = (predictHorizon * i) / steps;
      for (const a of this.asteroids) {
        const ax = this.wrapCoord(a.x + (a.vx * t) / 1000, this.config.width);
        const ay = this.wrapCoord(a.y + (a.vy * t) / 1000, this.config.height);
        if (!checkDistance(ax, ay)) return false;
      }
      for (const u of this.ufos) {
        const ux = u.x + (u.vx * t) / 1000;
        const uy = u.y + (u.vy * t) / 1000;
        if (!checkDistance(ux, uy)) return false;
      }
    }
    return true;
  }

  private wrapCoord(v: number, limit: number): number {
    let r = v;
    if (r < 0) r += limit;
    if (r > limit) r -= limit;
    return r;
  }

  private checkCollisions(): void {
    // Bullet-Asteroid collisions
    this.bullets.forEach((bullet, bulletIndex) => {
      this.asteroids.forEach((asteroid, asteroidIndex) => {
        if (this.collisionManager.isColliding(bullet, asteroid)) {
          this.handleAsteroidHit(asteroid, bulletIndex, asteroidIndex);
        }
      });
    });

    // Bullet-UFO collisions
    this.bullets.forEach((bullet, bulletIndex) => {
      this.ufos.forEach((ufo, ufoIndex) => {
        if (this.collisionManager.isColliding(bullet, ufo)) {
          // Bonus points
          this.addScore(250);
          this.createExplosion(ufo.x, ufo.y, 30);
          this.removeBullet(bulletIndex);
          this.gameContainer.removeChild(ufo.sprite);
          this.ufos.splice(ufoIndex, 1);
          this.audio.playExplosion();
        }
      });
    });

    // Player-Asteroid collisions (skip while inactive or invulnerable)
    if (!this.playerInactive && this.playerInvulnMsRemaining <= 0) {
      this.asteroids.forEach((asteroid, index) => {
        if (this.collisionManager.isColliding(this.player, asteroid)) {
          this.handlePlayerHit(index);
        }
      });
    }
  }

  private handleAsteroidHit(asteroid: Asteroid, bulletIndex: number, asteroidIndex: number): void {
    // Remove bullet and asteroid
    this.removeBullet(bulletIndex);
    this.removeAsteroid(asteroidIndex);

    // Add score
    this.addScore(asteroid.size * 10);

    // Create explosion particles
    this.createExplosion(asteroid.x, asteroid.y, asteroid.size);

    // Sound
    this.audio.playAsteroidBreak(asteroid.size);

    // Split asteroid if it's large enough
    if (asteroid.size > 20) {
      this.splitAsteroid(asteroid);
    }
  }

  private handlePlayerHit(asteroidIndex: number): void {
    this.stats.lives--;
    this.uiManager.updateStats(this.stats);

    if (this.stats.lives <= 0) {
      this.gameOver();
    } else {
      // Begin delayed respawn
      this.playerInactive = true;
      this.player.sprite.visible = false;
      this.respawnMsRemaining = 1200; // initial delay
      this.createExplosion(this.player.x, this.player.y, 30);
    }

    this.removeAsteroid(asteroidIndex);
  }

  private shoot(): void {
    const bullet = this.player.shoot();
    if (bullet) {
      this.bullets.push(bullet);
      this.gameContainer.addChild(bullet.sprite);
      this.audio.playShoot();
    }
  }

  private createExplosion(x: number, y: number, size: number): void {
    const particleCount = Math.floor(size / 2);
    for (let i = 0; i < particleCount; i++) {
      const particle = new Particle(x, y);
      this.particles.push(particle);
      this.gameContainer.addChild(particle.sprite);
    }
  }

  private splitAsteroid(asteroid: Asteroid): void {
    const newSize = asteroid.size / 2;
    for (let i = 0; i < 2; i++) {
      const newAsteroid = new Asteroid(
        asteroid.x + (Math.random() - 0.5) * 20,
        asteroid.y + (Math.random() - 0.5) * 20,
        newSize,
        asteroid.vx + (Math.random() - 0.5) * 50,
        asteroid.vy + (Math.random() - 0.5) * 50,
        this.config
      );
      this.asteroids.push(newAsteroid);
      this.gameContainer.addChild(newAsteroid.sprite);
    }
  }

  private spawnAsteroids(): void {
    const asteroidCount = 3 + this.stats.level;
    for (let i = 0; i < asteroidCount; i++) {
      const size = 40 + Math.random() * 20;
      const vx = (Math.random() - 0.5) * this.config.asteroidSpeed;
      const vy = (Math.random() - 0.5) * this.config.asteroidSpeed;

      // Find a position safely away from the player and not overlapping existing asteroids
      let x = 0;
      let y = 0;
      const minSafeFromPlayer = 220 + size; // keep clear buffer around ship
      const overlapPadding = 20; // spacing between asteroids
      let tries = 0;
      const maxTries = 200;

      while (tries < maxTries) {
        x = Math.random() * this.config.width;
        y = Math.random() * this.config.height;
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer < minSafeFromPlayer) {
          tries++;
          continue;
        }
        // ensure not overlapping too closely with already placed asteroids
        const tooClose = this.asteroids.some((a) => {
          const ddx = x - a.x;
          const ddy = y - a.y;
          const minDist = size / 2 + a.size / 2 + overlapPadding;
          return Math.hypot(ddx, ddy) < minDist;
        });
        if (tooClose) {
          tries++;
          continue;
        }
        break;
      }

      const asteroid = new Asteroid(x, y, size, vx, vy, this.config);
      this.asteroids.push(asteroid);
      this.gameContainer.addChild(asteroid.sprite);
    }
  }

  private stars: { x: number; y: number; size: number }[] | null = null;

  private render(): void {
    // Draw stars background
    this.drawStars();
  }

  private drawStars(): void {
    // Only regenerate on first call (per level) to avoid flicker
    if (!this.stars) {
      this.stars = [];
      const starCount = 120;
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.config.width,
          y: Math.random() * this.config.height,
          size: 1 + Math.floor(Math.random() * 3),
        });
      }
    }

    this.backgroundContainer.removeChildren();

    for (const s of this.stars) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff);
      star.drawRect(s.x, s.y, s.size, s.size);
      star.endFill();
      this.backgroundContainer.addChild(star);
    }
  }

  private nextLevel(): void {
    this.stats.level++;
    this.uiManager.updateStats(this.stats);
    this.spawnAsteroids();
    // Reschedule UFO timers for the new level
    this.scheduleUfoTimersForLevel();
    // Regenerate starfield for the new level
    this.stars = null;
  }

  private addScore(points: number): void {
    this.stats.score += points;
    // Bonus life every 100,000
    if (this.stats.score >= this.nextBonusAt) {
      this.stats.lives += 1;
      this.nextBonusAt += 100000;
    }
    this.uiManager.updateStats(this.stats);
  }

  private gameOver(): void {
    this.gameState = 'gameOver';
    this.uiManager.showGameOver(this.stats.score);
    this.clearUfoTimers();
    this.audio.setThrustActive(false);
    this.audio.stopUfo();
  }

  private togglePause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.uiManager.showPauseMenu();
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.uiManager.hidePauseMenu();
    }
  }

  private restart(): void {
    this.gameState = 'playing';
    this.stats = { score: 0, lives: 3, level: 1 };
    this.nextBonusAt = 100000;
    
    // Clear all game objects
    this.clearGameObjects();
    
    // Reset player
    this.player.reset(this.config.width / 2, this.config.height / 2);
    // Re-attach exhaust for mode
    this.player.onExhaust = this.mode === 'enhanced' ? (x, y) => this.emitExhaust(x, y) : undefined;
    
    // Update UI
    this.uiManager.updateStats(this.stats);
    this.uiManager.hideGameOver();
    this.uiManager.hidePauseMenu();
    this.uiManager.setModeButtonEnabled(true); // allow choosing mode before moving
    
    // Spawn new asteroids
    this.spawnAsteroids();
    // Reschedule UFO timers for fresh level
    this.scheduleUfoTimersForLevel();
    // Regenerate starfield
    this.stars = null;

    // reset audio state
    this.audio.setThrustActive(false);
    this.audio.stopUfo();
  }

  private clearGameObjects(): void {
    // Clear bullets
    this.bullets.forEach(bullet => this.gameContainer.removeChild(bullet.sprite));
    this.bullets = [];
    
    // Clear asteroids
    this.asteroids.forEach(asteroid => this.gameContainer.removeChild(asteroid.sprite));
    this.asteroids = [];
    
    // Clear UFOs
    this.ufos.forEach(ufo => this.gameContainer.removeChild(ufo.sprite));
    this.ufos = [];

    // Clear particles
    this.particles.forEach(particle => this.gameContainer.removeChild(particle.sprite));
    this.particles = [];

    // Clear timers
    this.clearUfoTimers();
  }

  private removeBullet(index: number): void {
    if (this.bullets[index]) {
      this.gameContainer.removeChild(this.bullets[index].sprite);
      this.bullets.splice(index, 1);
    }
  }

  private removeAsteroid(index: number): void {
    if (this.asteroids[index]) {
      this.gameContainer.removeChild(this.asteroids[index].sprite);
      this.asteroids.splice(index, 1);
    }
  }

  private removeParticle(index: number): void {
    if (this.particles[index]) {
      this.gameContainer.removeChild(this.particles[index].sprite);
      this.particles.splice(index, 1);
    }
  }

  private emitExhaust(x: number, y: number): void {
    // Small, short-lived light blue dot behind ship
    const g = new PIXI.Graphics();
    g.beginFill(0x7fd8ff, 0.95); // light blue
    g.drawCircle(0, 0, 2.2);
    g.endFill();
    g.position.set(x, y);
    this.gameContainer.addChild(g);

    // Simple fade-out over ~140ms
    const lifetime = 140;
    let remaining = lifetime;
    const tick = (dt: number) => {
      remaining -= dt;
      g.alpha = Math.max(0, remaining / lifetime);
      if (remaining <= 0) {
        this.app.ticker.remove(tick);
        this.gameContainer.removeChild(g);
      }
    };
    this.app.ticker.add(tick);
  }
}
