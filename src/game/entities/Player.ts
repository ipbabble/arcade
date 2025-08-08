import * as PIXI from 'pixi.js';
import { GameObject, GameConfig, InputState } from '../../types/game';
import { Bullet } from './Bullet';

export class Player implements GameObject {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 15;
  public rotation: number = 0;
  public sprite: PIXI.Graphics;

  private thrust: number = 0.5;
  private maxSpeed: number = 5;
  private friction: number = 0.98;
  private rotationSpeedRadPerSec: number = 3.6; // increased for snappier turning
  private shootCooldown: number = 0;
  private shootDelay: number = 200; // milliseconds
  private config: GameConfig;

  // Optional exhaust callback assigned by game to create particles
  public onExhaust?: (x: number, y: number) => void;
  private exhaustAccumMs = 0;
  private exhaustEmitIntervalMs = 90; // slightly more frequent for visibility

  constructor(x: number, y: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.config = config;
    this.sprite = this.createSprite();
    this.updateSprite();
  }

  private createSprite(): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    sprite.lineStyle(2, 0x00ff00);
    sprite.beginFill(0x00ff00, 0.3);
    
    // Draw ship shape
    sprite.moveTo(15, 0);
    sprite.lineTo(-10, -8);
    sprite.lineTo(-5, 0);
    sprite.lineTo(-10, 8);
    sprite.lineTo(15, 0);
    sprite.endFill();
    
    return sprite;
  }

  private updateSprite(): void {
    this.sprite.position.set(this.x, this.y);
    this.sprite.rotation = this.rotation;
  }

  public update(deltaTime: number, keys: InputState, config: GameConfig): void {
    const dt = deltaTime / 1000; // to seconds

    // Rotation (time-based for finer granularity)
    if (keys['ArrowLeft'] || keys['KeyA']) {
      this.rotation -= this.rotationSpeedRadPerSec * dt;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      this.rotation += this.rotationSpeedRadPerSec * dt;
    }

    // Thrust
    const thrusting = !!(keys['ArrowUp'] || keys['KeyW']);
    if (thrusting) {
      this.vx += Math.cos(this.rotation) * this.thrust;
      this.vy += Math.sin(this.rotation) * this.thrust;
      // Emit a small exhaust dot at the rear (throttled)
      if (this.onExhaust) {
        this.exhaustAccumMs += deltaTime;
        if (this.exhaustAccumMs >= this.exhaustEmitIntervalMs) {
          this.exhaustAccumMs = 0;
          const rearDistance = 12;
          const exX = this.x - Math.cos(this.rotation) * rearDistance;
          const exY = this.y - Math.sin(this.rotation) * rearDistance;
          this.onExhaust(exX, exY);
        }
      }
    } else {
      this.exhaustAccumMs = 0;
    }

    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wrap around screen
    if (this.x < 0) this.x = config.width;
    if (this.x > config.width) this.x = 0;
    if (this.y < 0) this.y = config.height;
    if (this.y > config.height) this.y = 0;

    // Update shoot cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    // Update sprite
    this.updateSprite();
  }

  public shoot(): Bullet | null {
    if (this.shootCooldown <= 0) {
      const bulletSpeed = this.config.bulletSpeed;
      
      // Calculate bullet starting position at the tip of the ship
      const shipTipDistance = 15; // Distance from center to tip
      const bulletStartX = this.x + Math.cos(this.rotation) * shipTipDistance;
      const bulletStartY = this.y + Math.sin(this.rotation) * shipTipDistance;
      
      // Calculate bullet velocity
      const bulletVx = Math.cos(this.rotation) * bulletSpeed + this.vx;
      const bulletVy = Math.sin(this.rotation) * bulletSpeed + this.vy;

      this.shootCooldown = this.shootDelay;
      return new Bullet(bulletStartX, bulletStartY, bulletVx, bulletVy, this.config);
    }
    return null;
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.updateSprite();
  }
}
