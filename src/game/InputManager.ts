import { InputState } from '../types/game';

export class InputManager {
  public keys: InputState = {};
  public onPause?: () => void;
  public onRestart?: () => void;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Game control keys
      if (e.code === 'Space') {
        e.preventDefault();
        console.log('Spacebar pressed');
      } else if (e.code === 'KeyP') {
        this.onPause?.();
      } else if (e.code === 'KeyR') {
        this.onRestart?.();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }
}
