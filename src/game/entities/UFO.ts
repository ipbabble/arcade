import * as PIXI from 'pixi.js';
import { GameObject, GameConfig } from '../../types/game';

export class UFO implements GameObject {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number = 14;
  public sprite: PIXI.Graphics;

  private config: GameConfig;

  constructor(spawnFromLeft: boolean, y: number, config: GameConfig) {
    this.config = config;
    this.y = y;
    this.x = spawnFromLeft ? -30 : config.width + 30;
    this.vx = (spawnFromLeft ? 1 : -1) * (80 + Math.random() * 60); // 80-140 px/s
    this.vy = (Math.random() - 0.5) * 20; // slight drift
    this.sprite = this.createSprite();
    this.updateSprite();
  }

  private createSprite(): PIXI.Graphics {
    const g = new PIXI.Graphics();
    g.lineStyle(2, 0xff66ff);
    g.beginFill(0x9933ff, 0.35);
    // Simple saucer: ellipse hull + dome
    g.drawEllipse(0, 0, 18, 8);
    g.endFill();
    g.beginFill(0xff66ff, 0.6);
    g.drawEllipse(0, -4, 8, 5);
    g.endFill();
    return g;
  }

  private updateSprite(): void {
    this.sprite.position.set(this.x, this.y);
  }

  public update(deltaTime: number): void {
    this.x += (this.vx * deltaTime) / 1000;
    this.y += (this.vy * deltaTime) / 1000;
    this.updateSprite();
  }

  public isOffscreen(): boolean {
    return this.x < -40 || this.x > this.config.width + 40 || this.y < -40 || this.y > this.config.height + 40;
  }
}
