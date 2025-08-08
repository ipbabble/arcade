import * as PIXI from 'pixi.js';
import { GameObject, GameConfig } from '../../types/game';

export class Bullet implements GameObject {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number = 3;
  public sprite: PIXI.Graphics;
  public life: number;

  private config: GameConfig;

  constructor(x: number, y: number, vx: number, vy: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.config = config;
    this.life = config.bulletLifetime;
    this.sprite = this.createSprite();
    this.updateSprite();
  }

  private createSprite(): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    sprite.lineStyle(1, 0xffff00);
    sprite.beginFill(0xffff00);
    sprite.drawCircle(0, 0, this.radius);
    sprite.endFill();
    return sprite;
  }

  private updateSprite(): void {
    this.sprite.position.set(this.x, this.y);
  }

  public update(deltaTime: number, width: number, height: number): void {
    this.x += (this.vx * deltaTime) / 1000;
    this.y += (this.vy * deltaTime) / 1000;
    this.life -= deltaTime;

    // Wrap around screen edges like the ship/asteroids
    if (this.x < 0) this.x += width;
    if (this.x > width) this.x -= width;
    if (this.y < 0) this.y += height;
    if (this.y > height) this.y -= height;

    this.updateSprite();
  }

  public isOffscreen(width: number, height: number): boolean {
    // Bullets only expire by lifetime; wrapping keeps them onscreen
    return this.life <= 0;
  }
}
