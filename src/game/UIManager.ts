import { GameStats, GameMode } from '../types/game';

export class UIManager {
  private stats: GameStats;
  private uiContainer: HTMLDivElement;
  private gameOverElement: HTMLDivElement;
  private pauseMenuElement: HTMLDivElement;
  private confirmRestartElement: HTMLDivElement;
  private controlsElement: HTMLDivElement;
  private modeButton: HTMLButtonElement | null = null;
  private restartButtonTop: HTMLButtonElement | null = null;

  private onRestart?: () => void;
  private onToggleMode?: () => void;

  constructor(stats: GameStats) {
    this.stats = stats;
    this.createUI();
  }

  public bindHandlers(handlers: { onRestart?: () => void; onToggleMode?: () => void }) {
    this.onRestart = handlers.onRestart;
    this.onToggleMode = handlers.onToggleMode;
  }

  public setModeButtonEnabled(enabled: boolean): void {
    if (this.modeButton) this.modeButton.disabled = !enabled;
  }

  private createUI(): void {
    // Create UI container
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'game-ui';
    this.uiContainer.innerHTML = `
      <div>Score: <span id="score">0</span></div>
      <div>Lives: <span id="lives">3</span></div>
      <div>Level: <span id="level">1</span></div>
    `;

    // Add top controls (mode toggle + restart)
    const tools = document.createElement('div');
    tools.className = 'auto-hide';
    const modeBtn = document.createElement('button');
    modeBtn.textContent = 'Mode: enhanced';
    const restartBtnTop = document.createElement('button');
    restartBtnTop.textContent = 'Restart';
    tools.appendChild(modeBtn);
    tools.appendChild(restartBtnTop);
    this.uiContainer.appendChild(tools);
    this.modeButton = modeBtn;
    this.restartButtonTop = restartBtnTop;

    // Create controls info
    this.controlsElement = document.createElement('div');
    this.controlsElement.className = 'controls';
    this.controlsElement.innerHTML = `
      <h3>Controls:</h3>
      <p>WASD or Arrow Keys - Move</p>
      <p>Spacebar - Shoot</p>
      <p>P - Pause</p>
      <p>R - Restart</p>
    `;

    // Create game over screen
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.className = 'game-over hidden';
    this.gameOverElement.innerHTML = `
      <h2>Game Over!</h2>
      <p>Final Score: <span id="finalScore">0</span></p>
      <button id="restartBtn">Play Again</button>
    `;

    // Create pause menu
    this.pauseMenuElement = document.createElement('div');
    this.pauseMenuElement.className = 'pause-menu hidden';
    this.pauseMenuElement.innerHTML = `
      <h2>Paused</h2>
      <button id="resumeBtn">Resume</button>
    `;

    // Create confirm restart modal
    this.confirmRestartElement = document.createElement('div');
    this.confirmRestartElement.className = 'pause-menu hidden';
    this.confirmRestartElement.innerHTML = `
      <h2>Restart game?</h2>
      <div style="margin-top:10px">
        <button id="confirmYes">Yes</button>
        <button id="confirmNo">No</button>
      </div>
    `;

    // Add elements to page
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.appendChild(this.uiContainer);
      appElement.appendChild(this.controlsElement);
      appElement.appendChild(this.gameOverElement);
      appElement.appendChild(this.pauseMenuElement);
      appElement.appendChild(this.confirmRestartElement);
    }

    // Auto-hide controls after a short delay
    window.setTimeout(() => {
      this.controlsElement.classList.add('hidden');
    }, 2500);
    // Auto-hide tools row after a short delay
    window.setTimeout(() => {
      const toolsRow = this.uiContainer.querySelector('.auto-hide');
      toolsRow?.classList.add('hidden');
    }, 4000);

    // Setup button event listeners
    this.setupButtonListeners();
  }

  private setupButtonListeners(): void {
    const restartBtn = document.getElementById('restartBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const yesBtn = this.confirmRestartElement.querySelector('#confirmYes') as HTMLButtonElement | null;
    const noBtn = this.confirmRestartElement.querySelector('#confirmNo') as HTMLButtonElement | null;

    restartBtn?.addEventListener('click', () => {
      // Game over screen: direct restart is fine
      if (this.onRestart) this.onRestart();
    });

    resumeBtn?.addEventListener('click', () => {
      this.hidePauseMenu();
    });

    this.restartButtonTop?.addEventListener('click', () => {
      this.showConfirmRestart();
    });

    yesBtn?.addEventListener('click', () => {
      this.hideConfirmRestart();
      if (this.onRestart) this.onRestart();
    });

    noBtn?.addEventListener('click', () => {
      this.hideConfirmRestart();
    });

    this.modeButton?.addEventListener('click', () => {
      if (this.onToggleMode) this.onToggleMode();
    });
  }

  public showConfirmRestart(): void {
    this.confirmRestartElement.classList.remove('hidden');
  }

  public hideConfirmRestart(): void {
    this.confirmRestartElement.classList.add('hidden');
  }

  public updateModeLabel(mode: GameMode): void {
    if (this.modeButton) {
      this.modeButton.textContent = `Mode: ${mode}`;
    }
  }

  public updateStats(stats: GameStats): void {
    this.stats = stats;
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const levelElement = document.getElementById('level');

    if (scoreElement) {
      scoreElement.textContent = Math.floor(stats.score).toString();
      scoreElement.classList.add('score-update');
      setTimeout(() => {
        scoreElement.classList.remove('score-update');
      }, 300);
    }

    if (livesElement) {
      livesElement.textContent = stats.lives.toString();
    }

    if (levelElement) {
      levelElement.textContent = stats.level.toString();
    }
  }

  public showGameOver(finalScore: number): void {
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
      finalScoreElement.textContent = Math.floor(finalScore).toString();
    }
    this.gameOverElement.classList.remove('hidden');
  }

  public hideGameOver(): void {
    this.gameOverElement.classList.add('hidden');
  }

  public showPauseMenu(): void {
    this.pauseMenuElement.classList.remove('hidden');
  }

  public hidePauseMenu(): void {
    this.pauseMenuElement.classList.add('hidden');
  }
}
