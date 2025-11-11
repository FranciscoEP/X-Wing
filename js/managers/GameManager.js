// ============================================
// GAME MANAGER - Estado y control del juego
// ============================================

class GameManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Estado del juego
    this.state = GAME_STATES.MENU;
    this.previousState = null;

    // Dificultad seleccionada
    this.difficulty = DIFFICULTY.NORMAL;

    // Variables de juego
    this.frames = 0;
    this.interval = null;
    this.isPaused = false;

    // Puntuación y vidas
    this.score = 0;
    this.lives = 3;

    // Fase actual
    this.currentPhase = 0;
    this.enemiesKilled = 0;

    // Colecciones de entidades
    this.entities = {
      player: null,
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      powerUps: [],
      bosses: []
    };

    // Audio
    this.audio = {
      bgMusic: null,
      sfx: {}
    };

    // Input
    this.keys = [];

    // Inicializar event listeners
    this.initEventListeners();
  }

  // ==========================================
  // CONTROL DE ESTADO
  // ==========================================

  setState(newState) {
    console.log(`Estado: ${this.state} -> ${newState}`);
    this.previousState = this.state;
    this.state = newState;
    this.onStateChange(newState);
  }

  onStateChange(state) {
    switch(state) {
      case GAME_STATES.MENU:
        this.showMenu();
        break;
      case GAME_STATES.PLAYING:
        this.startPlaying();
        break;
      case GAME_STATES.PAUSED:
        this.pause();
        break;
      case GAME_STATES.GAME_OVER:
        this.gameOver();
        break;
      case GAME_STATES.VICTORY:
        this.victory();
        break;
    }
  }

  // ==========================================
  // CICLO DE JUEGO
  // ==========================================

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.update(), 1000 / GAME_CONFIG.FPS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  update() {
    if (this.isPaused) return;

    this.frames++;

    // Update según el estado
    switch(this.state) {
      case GAME_STATES.PLAYING:
        this.updatePlaying();
        break;
      case GAME_STATES.BOSS_FIGHT:
        this.updateBossFight();
        break;
    }

    this.render();
  }

  updatePlaying() {
    // Esta función se implementará más adelante
    // Actualiza el jugador, enemigos, balas, colisiones, etc.
  }

  updateBossFight() {
    // Esta función se implementará más adelante
    // Lógica específica para peleas de jefes
  }

  render() {
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Renderizar según el estado
    switch(this.state) {
      case GAME_STATES.MENU:
        this.renderMenu();
        break;
      case GAME_STATES.PLAYING:
      case GAME_STATES.BOSS_FIGHT:
        this.renderGame();
        break;
      case GAME_STATES.PAUSED:
        this.renderGame();
        this.renderPauseOverlay();
        break;
      case GAME_STATES.GAME_OVER:
        this.renderGameOver();
        break;
      case GAME_STATES.VICTORY:
        this.renderVictory();
        break;
    }
  }

  renderGame() {
    // Esta función se implementará más adelante
    // Renderiza todos los elementos del juego
  }

  renderMenu() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '40px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('X-WING: Asalto a la Estrella de la Muerte', this.canvas.width / 2, 150);

    this.ctx.font = '20px Georgia';
    this.ctx.fillText('Presiona ENTER para comenzar', this.canvas.width / 2, 250);
  }

  renderPauseOverlay() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '40px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSA', this.canvas.width / 2, this.canvas.height / 2);
  }

  renderGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = '50px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '25px Georgia';
    this.ctx.fillText(`Puntuación Final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.ctx.fillText('Presiona R para reiniciar', this.canvas.width / 2, this.canvas.height / 2 + 70);
  }

  renderVictory() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '50px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('¡VICTORIA!', this.canvas.width / 2, this.canvas.height / 2 - 50);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '25px Georgia';
    this.ctx.fillText(`Puntuación Final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
  }

  // ==========================================
  // FUNCIONES DE ESTADO
  // ==========================================

  showMenu() {
    this.stop();
  }

  startPlaying() {
    this.reset();
    this.start();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.setState(this.previousState);
  }

  gameOver() {
    this.stop();
    if (this.audio.bgMusic) {
      this.audio.bgMusic.pause();
    }
  }

  victory() {
    this.stop();
  }

  reset() {
    this.frames = 0;
    this.score = 0;
    this.lives = this.difficulty.playerLives;
    this.currentPhase = 0;
    this.enemiesKilled = 0;

    // Limpiar entidades
    this.entities.enemies = [];
    this.entities.playerBullets = [];
    this.entities.enemyBullets = [];
    this.entities.powerUps = [];
    this.entities.bosses = [];
  }

  restart() {
    this.setState(GAME_STATES.MENU);
    this.reset();
  }

  // ==========================================
  // PUNTUACIÓN Y VIDAS
  // ==========================================

  addScore(points) {
    this.score += points;
  }

  loseLife() {
    this.lives--;
    if (this.lives <= 0) {
      this.setState(GAME_STATES.GAME_OVER);
    }
  }

  addLife() {
    this.lives++;
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  initEventListeners() {
    // Keyboard input
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    this.keys[e.keyCode] = true;

    // Controles globales
    switch(e.keyCode) {
      case GAME_CONFIG.KEYS.ENTER:
        if (this.state === GAME_STATES.MENU) {
          this.setState(GAME_STATES.PLAYING);
        }
        break;

      case GAME_CONFIG.KEYS.PAUSE:
      case GAME_CONFIG.KEYS.ESC:
        if (this.state === GAME_STATES.PLAYING) {
          this.setState(GAME_STATES.PAUSED);
        } else if (this.state === GAME_STATES.PAUSED) {
          this.resume();
        }
        break;

      case 82: // R key - Restart
        if (this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.VICTORY) {
          this.restart();
        }
        break;
    }
  }

  onKeyUp(e) {
    this.keys[e.keyCode] = false;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    console.log(`Dificultad establecida: ${difficulty.name}`);
  }

  nextPhase() {
    this.currentPhase++;
    if (this.currentPhase >= GAME_PHASES.length) {
      this.setState(GAME_STATES.VICTORY);
    }
  }

  getCurrentPhase() {
    return GAME_PHASES[this.currentPhase];
  }
}
