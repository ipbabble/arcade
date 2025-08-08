import * as PIXI from 'pixi.js';
import { GameObject, GameConfig } from '../../types/game';

export class Asteroid implements GameObject {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public radius: number;
  public rotation: number = 0;
  public sprite: PIXI.Graphics;

  private rotationSpeed: number;
  private vertices: Vector2D[];
  private config: GameConfig;

  constructor(x: number, y: number, size: number, vx: number, vy: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.radius = size / 2;
    this.config = config;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.vertices = this.generateVertices();
    this.sprite = this.createSprite();
    this.updateSprite();
  }

  private generateVertices(): Vector2D[] {
    const vertices: Vector2D[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radius = this.size / 2 + (Math.random() - 0.5) * 10;
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return vertices;
  }

  private createSprite(): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    sprite.lineStyle(2, 0x888888);
    sprite.beginFill(0x444444, 0.3);

    // Draw asteroid shape
    this.vertices.forEach((vertex, index) => {
      if (index === 0) {
        sprite.moveTo(vertex.x, vertex.y);
      } else {
        sprite.lineTo(vertex.x, vertex.y);
      }
    });

    sprite.closePath();
    sprite.endFill();

    return sprite;
  }

  private updateSprite(): void {
    this.sprite.position.set(this.x, this.y);
    this.sprite.rotation = this.rotation;
  }

  public update(deltaTime: number, width: number, height: number): void {
    this.x += this.vx * deltaTime / 1000;
    this.y += this.vy * deltaTime / 1000;
    this.rotation += this.rotationSpeed;

    // Wrap around screen
    if (this.x < -this.size) this.x = width + this.size;
    if (this.x > width + this.size) this.x = -this.size;
    if (this.y < -this.size) this.y = height + this.size;
    if (this.y > height + this.size) this.y = -this.size;

    this.updateSprite();
  }
}

interface Vector2D {
  x: number;
  y: number;
}
