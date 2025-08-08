import * as PIXI from 'pixi.js';

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number = 1.0;
  public sprite: PIXI.Graphics;

  private decay: number = 0.02;
  private size: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 200;
    this.vy = (Math.random() - 0.5) * 200;
    this.size = Math.random() * 3 + 1;
    this.sprite = this.createSprite();
    this.updateSprite();
  }

  private createSprite(): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    sprite.beginFill(0xffff00, this.life);
    sprite.drawCircle(0, 0, this.size);
    sprite.endFill();
    return sprite;
  }

  private updateSprite(): void {
    this.sprite.position.set(this.x, this.y);
    this.sprite.alpha = this.life;
    this.sprite.scale.set(this.size / 2);
  }

  public update(deltaTime: number): void {
    this.x += this.vx * deltaTime / 1000;
    this.y += this.vy * deltaTime / 1000;
    this.life -= this.decay;
    this.size *= 0.98;
    this.updateSprite();
  }
}
