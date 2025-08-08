export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export type GameState = 'playing' | 'paused' | 'gameOver';
export type GameMode = 'traditional' | 'enhanced';

export interface GameConfig {
  width: number;
  height: number;
  playerSpeed: number;
  bulletSpeed: number;
  asteroidSpeed: number;
  maxBullets: number;
  bulletLifetime: number;
}

export interface InputState {
  [key: string]: boolean;
}

export interface GameStats {
  score: number;
  lives: number;
  level: number;
}
