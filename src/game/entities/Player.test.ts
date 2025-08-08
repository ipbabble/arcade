import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player } from './Player';
import type { GameConfig, InputState } from '../../types/game';

vi.mock('pixi.js', () => {
  class Graphics {
    rotation = 0;
    position = { set: (_x: number, _y: number) => {} };
    lineStyle() {}
    beginFill() {}
    moveTo() {}
    lineTo() {}
    endFill() {}
  }
  return { Graphics };
});

const config: GameConfig = {
  width: 800,
  height: 600,
  bulletSpeed: 8,
  bulletLifetimeMs: 1200,
};

describe('Player movement', () => {
  it('applies thrust and friction and wraps around edges', () => {
    const player = new Player(10, 10, config);
    player.rotation = Math.PI / 4; // 45 degrees so both x & y change
    const keys: InputState = { ArrowUp: true };

    const beforeVx = player.vx;
    const beforeVy = player.vy;
    const beforeX = player.x;
    const beforeY = player.y;

    player.update(100, keys, config); // 100ms

    expect(player.vx).not.toBe(beforeVx);
    expect(player.vy).not.toBe(beforeVy);
    expect(player.x).not.toBe(beforeX);
    expect(player.y).not.toBe(beforeY);

    // Force wrap by moving far left
    player.x = -1;
    player.update(16, {}, config);
    expect(player.x).toBe(config.width);
  });
});
