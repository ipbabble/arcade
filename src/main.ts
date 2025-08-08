import * as PIXI from 'pixi.js';
import { AsteroidsGame } from './game/AsteroidsGame';
import './style.css';

function getSquareSize(): number {
  const margin = 40; // small padding around
  const size = Math.min(window.innerWidth, window.innerHeight) - margin;
  return Math.max(600, Math.min(900, Math.floor(size))); // clamp to sensible bounds
}

async function createApp(): Promise<PIXI.Application> {
  // Support Pixi v7 (init) and v6 (constructor options)
  const AnyApp = PIXI.Application as unknown as {
    new (...args: any[]): PIXI.Application;
    prototype: any;
  };

  const size = getSquareSize();
  // @ts-ignore runtime feature detection
  const supportsInit = typeof AnyApp.prototype?.init === 'function';

  if (supportsInit) {
    const app = new AnyApp();
    // @ts-ignore - available in Pixi v7
    await (app as any).init({
      width: size,
      height: size,
      background: '#000000',
      antialias: true,
    });
    return app as unknown as PIXI.Application;
  }

  // Fallback for Pixi v6
  const app = new AnyApp({
    width: size,
    height: size,
    backgroundColor: 0x000000,
    antialias: true,
  });
  return app as unknown as PIXI.Application;
}

async function init() {
  const app = await createApp();

  // v7 uses app.canvas, v6 uses app.view
  const canvasEl: HTMLCanvasElement = (app as any).canvas ?? (app as any).view;
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.appendChild(canvasEl);
  } else {
    document.body.appendChild(canvasEl);
  }

  new AsteroidsGame(app);
}

init().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize Pixi application:', err);
});
