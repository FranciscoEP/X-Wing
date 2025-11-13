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

    // Phase Manager
    this.phaseManager = new PhaseManager(this);

    // Entidades del juego
    this.background = new Background();

    // Reiniciar transiciones
    this.transitionScreen = new TransitionScreen();
    this.player = new Player(200, GAME_CONFIG.CANVAS_HEIGHT / 2 - 50, ASSETS.images.player1);
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];

    // UI
    this.hud = new HUD();
    this.transitionScreen = new TransitionScreen();

    // Audio
    this.audio = {
      bgMusic: new Audio(ASSETS.sounds.mainTitle),
      shootSound: new Audio(ASSETS.sounds.pewPew),
      deathSound: new Audio(ASSETS.sounds.death)
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

        this.initBossFight(this.phaseManager.getCurrentPhase());
                this.updateBossFight();
        break;
    }

    this.render();
  }

  updatePlaying() {
    // Actualizar transiciones del phase manager
    this.phaseManager.updateTransition();

    // Si hay transición activa, no actualizar el juego
    if (this.phaseManager.isTransitioning) {
      return;
    }

    // Actualizar estadísticas de la fase
    this.phaseManager.updatePhaseStats();

    // Actualizar fondo
    this.background.update();

    // Actualizar jugador
    this.player.update(this.keys);

    // Disparar si se presiona J
    if (this.keys[GAME_CONFIG.KEYS.SHOOT]) {
      const bullets = this.player.shoot();
      if (bullets) {
        this.playerBullets.push(...bullets);
        Utils.playSound(this.audio.shootSound, 0.3);
      }
    }

    // Actualizar balas del jugador
    this.updatePlayerBullets();

    // Generar enemigos
    this.spawnEnemies();

    // Actualizar enemigos
    this.updateEnemies();

    // Actualizar balas enemigas
    this.updateEnemyBullets();

    // Actualizar power-ups
    this.updatePowerUps();

    // Verificar colisiones
    this.checkCollisions();

    // Verificar condición de victoria de fase
    this.checkPhaseComplete();

    // Verificar si el jugador murió
    if (this.player.isDead && !this.player.respawn()) {
      this.setState(GAME_STATES.GAME_OVER);
    }
  }

  updateBossFight() {
    // Actualizar el jefe primero
    if (this.currentBoss && this.currentBoss.active) {
      this.currentBoss.update();

      // Disparar periódicamente
      if (this.frames % 60 === 0) {
        const bullets = this.currentBoss.shoot();
        if (bullets) {
          this.enemyBullets.push(...bullets);
        }
      }
    }

    // Llamar a update normal
    this.updatePlaying();

    // Verificar colisiones con jefe
    this.checkBossCollisions();
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

        this.initBossFight(this.phaseManager.getCurrentPhase());
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
    // Fondo
    this.background.draw(this.ctx);

    // Jugador
    this.player.draw(this.ctx);

    // Balas del jugador
    this.playerBullets.forEach(bullet => bullet.draw(this.ctx));

    // Enemigos
    this.enemies.forEach(enemy => enemy.draw(this.ctx));

    // Balas enemigas
    this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));

    // Power-ups
    this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));

    // HUD
    const currentPhase = this.phaseManager.getCurrentPhase();
    this.hud.draw(this.ctx, this.player, this.score, currentPhase);

    // Transiciones del phase manager
    this.phaseManager.renderTransition(this.ctx);

    // Transiciones de pantalla
    this.transitionScreen.draw(this.ctx, this.canvas);
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
    this.phaseManager.startFirstPhase();
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
    // Reiniciar phase manager
    this.phaseManager = new PhaseManager(this);

    // Reiniciar jugador
    this.player = new Player(200, GAME_CONFIG.CANVAS_HEIGHT / 2 - 50, ASSETS.images.player1);
    this.player.lives = this.difficulty.playerLives;
    this.player.speed = this.difficulty.playerSpeed;

    // Limpiar entidades
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];

    // Reiniciar background
    this.background = new Background();

    // Reiniciar transiciones
    this.transitionScreen = new TransitionScreen();
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
    this.phaseManager.nextPhase();
  }
  }

  getCurrentPhase() {
    return this.phaseManager.getCurrentPhase();
  }

  // ==========================================
  // UPDATE AUXILIARES
  // ==========================================

  updatePlayerBullets() {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      this.playerBullets[i].update();

      if (this.playerBullets[i].isOffScreen()) {
        this.playerBullets.splice(i, 1);
      }
    }
  }

  updateEnemyBullets() {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      this.enemyBullets[i].update();

      if (this.enemyBullets[i].isOffScreen()) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update();

      // Hacer que dispare periódicamente
      if (this.frames % 90 === 0 && enemy.x < GAME_CONFIG.CANVAS_WIDTH - 100) {
        const bullets = enemy.shoot();
        if (bullets) {
          this.enemyBullets.push(...bullets);
        }
      }

      if (enemy.isOffScreen()) {
        this.enemies.splice(i, 1);
      }
    }
  }

  updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      this.powerUps[i].update();

      if (this.powerUps[i].isOffScreen()) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  spawnEnemies() {
    const phase = this.phaseManager.getCurrentPhase();
    if (!phase || phase.type !== 'NORMAL_COMBAT') return;

    // Verificar si ya spawneamos todos los enemigos de la fase
    const stats = this.phaseManager.phaseStats;

    // Verificar si ya spawneamos todos los enemigos de la fase
    if (stats.enemiesSpawned >= phase.enemyCount) return;

    // Spawn según el rate de la fase
    if (this.frames % phase.spawnRate === 0) {
      const randomY = Utils.randomRange(50, GAME_CONFIG.CANVAS_HEIGHT - 150);
      const enemy = new Enemy(GAME_CONFIG.CANVAS_WIDTH, randomY, phase.enemyType);

      // Aplicar multiplicador de dificultad
      enemy.speed *= this.difficulty.enemySpeedMultiplier;

      this.enemies.push(enemy);
      stats.enemiesSpawned++;
    }
  }

  checkCollisions() {
    // Colisiones: Balas del jugador vs Enemigos
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];

        if (bullet.isColliding(enemy)) {
          // Enemigo recibe daño
          const died = enemy.takeDamage(bullet.damage);

          if (died) {
            this.phaseManager.recordEnemyKilled();
            this.addScore(enemy.scoreValue);

            // Posibilidad de drop de power-up
            const powerUp = PowerUp.spawnRandom(
              enemy.x,
              enemy.y,
              this.difficulty.powerUpDropRate
            );

            if (powerUp) {
              this.powerUps.push(powerUp);
            }

            this.enemies.splice(j, 1);
          }

          bullet.destroy();
          this.playerBullets.splice(i, 1);
          break;
        }
      }
    }

    // Colisiones: Balas enemigas vs Jugador
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];

      if (bullet.isColliding(this.player)) {
        this.player.takeDamage(bullet.damage);
        this.phaseManager.recordDamage(bullet.damage);
        bullet.destroy();
        this.enemyBullets.splice(i, 1);

        // Efecto visual
        Utils.screenShake(this.canvas, 5, 100);
      }
    }

    // Colisiones: Power-ups vs Jugador
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];

      if (powerUp.isColliding(this.player)) {
        this.applyPowerUp(powerUp);
        this.phaseManager.recordPowerUpCollected();
        powerUp.collect();
        this.powerUps.splice(i, 1);
      }
    }

    // Colisiones: Jugador vs Enemigos (colisión directa)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isColliding(this.player)) {
        this.player.takeDamage(30);
        this.phaseManager.recordDamage(30); // Daño mayor por colisión directa
        enemy.destroy();
        this.enemies.splice(i, 1);

        Utils.screenShake(this.canvas, 10, 200);
      }
    }
  }

  checkPhaseComplete() {
    const phase = this.phaseManager.getCurrentPhase();
    if (!phase) return;

    if (phase.type === 'NORMAL_COMBAT') {
      // Fase completa si eliminamos todos los enemigos
      if (this.enemiesKilled >= phase.enemyCount) {
        this.completePhase();
      }
    }
  }

  completePhase() {
    console.log(`¡Fase ${this.currentPhase + 1} completada!`);

    // Bonus por completar fase
    this.addScore(SCORE_VALUES.PHASE_COMPLETE_BONUS);

    // Bonus por no recibir daño
    if (this.player.hp === this.player.maxHP) {
      this.addScore(SCORE_VALUES.NO_DAMAGE_BONUS);
    }

    // Avanzar a la siguiente fase
    this.nextPhase();

    // Reset para la nueva fase
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
  }

  applyPowerUp(powerUp) {
    const config = powerUp.config;

    console.log(`Power-up recogido: ${config.name}`);

    switch(powerUp.type) {
      // Ofensivos con duración
      case 'DUAL_SHOT':
      case 'QUAD_SHOT':
      case 'LASER_BEAM':
      case 'AUTO_AIM':
        this.player.addPowerUp(powerUp.type, config.duration * 60 / 1000);
        break;

      // Defensivos con duración
      case 'ENERGY_SHIELD':
        this.player.isInvulnerable = true;
        this.player.invulnerabilityTimer = config.duration * 60 / 1000;
        break;

      case 'SPEED_BOOST':
        this.player.speed = GAME_CONFIG.PLAYER_SPEED * 1.5;
        setTimeout(() => {
          this.player.speed = GAME_CONFIG.PLAYER_SPEED;
        }, config.duration);
        break;

      case 'PHASE_CLOAK':
        this.player.isInvulnerable = true;
        this.player.invulnerabilityTimer = config.duration * 60 / 1000;
        break;

      // Utilidad instantánea
      case 'REPAIR_KIT':
        this.player.heal(50);
        break;

      case 'SMART_BOMB':
        // Eliminar todas las balas enemigas
        this.enemyBullets = [];
        // Dañar todos los enemigos
        this.enemies.forEach(enemy => {
          enemy.takeDamage(50);
        });
        Utils.screenFlash(this.ctx, this.canvas, 'rgba(255, 255, 0, 0.5)', 200);
        break;

      case 'SLOW_MOTION':
        // TODO: Implementar slow motion en FASE 4
        break;

      case 'FORCE_POWER':
        // Empujar todas las balas hacia atrás
        this.enemyBullets.forEach(bullet => {
          bullet.speed *= -1;
        });
        break;

      default:
        console.log(`Power-up no implementado: ${powerUp.type}`);
    }

    this.addScore(50); // Bonus por recoger power-up
  }
}

  // ==========================================
  // BOSS MANAGEMENT
  // ==========================================

  initBossFight(phase) {
    console.log(`Iniciando pelea de jefe: ${phase.bossType}`);

    // Crear CSS Sprite Manager si no existe
    if (!this.cssSpriteManager) {
      this.cssSpriteManager = new CSSSpriteManager(this.canvas);
    }

    // Limpiar jefes anteriores
    if (this.currentBoss) {
      this.currentBoss.destroy();
    }

    // Crear el jefe según el tipo
    const bossX = GAME_CONFIG.CANVAS_WIDTH - 100;
    const bossY = GAME_CONFIG.CANVAS_HEIGHT / 2;

    switch(phase.bossType) {
      case 'TIE_ADVANCED':
        this.currentBoss = new TIEAdvanced(bossX, bossY - 75, this.cssSpriteManager);
        break;

      case 'STAR_DESTROYER':
        this.currentBoss = new StarDestroyer(bossX - 150, bossY - 100, this.cssSpriteManager);
        break;

      case 'DEATH_STAR':
        this.currentBoss = new DeathStar(bossX - 200, bossY - 200, this.cssSpriteManager);
        break;

      default:
        console.error(`Tipo de jefe desconocido: ${phase.bossType}`);
        return;
    }

    // Aplicar multiplicador de dificultad
    this.currentBoss.hp *= this.difficulty.bossHPMultiplier;
    this.currentBoss.maxHP *= this.difficulty.bossHPMultiplier;

    console.log(`Jefe creado: ${this.currentBoss.name} (${this.currentBoss.hp} HP)`);
  }

  updateBossFight() {
    // Actualizar el jefe
    if (this.currentBoss && this.currentBoss.active) {
      this.currentBoss.update();

      // Disparar periódicamente
      if (this.frames % 60 === 0) {
        const bullets = this.currentBoss.shoot();
        if (bullets) {
          this.enemyBullets.push(...bullets);
        }
      }

      // Star Destroyer puede spawnear TIE Fighters
      if (this.currentBoss.type === 'STAR_DESTROYER' && this.currentBoss.shouldSpawnTIE()) {
        const randomY = Utils.randomRange(50, GAME_CONFIG.CANVAS_HEIGHT - 150);
        const tie = new Enemy(GAME_CONFIG.CANVAS_WIDTH, randomY, 'TIE_FIGHTER');
        tie.speed *= this.difficulty.enemySpeedMultiplier;
        this.enemies.push(tie);
      }

      // Death Star superlaser
      if (this.currentBoss.type === 'DEATH_STAR' && this.currentBoss.isSuperLaserFiring()) {
        this.handleDeathStarSuperlaser();
      }
    }

    // Llamar a update normal para jugador, balas, etc
    this.updatePlaying();

    // Verificar colisiones con jefe
    this.checkBossCollisions();
  }

  checkBossCollisions() {
    if (!this.currentBoss || !this.currentBoss.active) return;

    // Balas del jugador vs Jefe
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];

      // Death Star tiene weak point
      if (this.currentBoss.type === 'DEATH_STAR') {
        const isWeakPoint = this.currentBoss.checkWeakPointHit(bullet);

        if (isWeakPoint) {
          const died = this.currentBoss.takeDamage(bullet.damage, true);

          if (died) {
            this.onBossDefeated();
          }

          bullet.destroy();
          this.playerBullets.splice(i, 1);
          Utils.screenShake(this.canvas, 15, 300);
          continue;
        }
      }

      // Colisión normal
      if (bullet.isColliding(this.currentBoss)) {
        const died = this.currentBoss.takeDamage(bullet.damage);

        if (died) {
          this.onBossDefeated();
        }

        bullet.destroy();
        this.playerBullets.splice(i, 1);
        Utils.screenShake(this.canvas, 8, 150);
      }
    }

    // Jugador vs Jefe (colisión directa)
    if (this.currentBoss.isColliding(this.player)) {
      this.player.takeDamage(50); // Daño masivo
      this.phaseManager.recordDamage(50);
      Utils.screenShake(this.canvas, 20, 500);
    }
  }

  onBossDefeated() {
    console.log(`¡Jefe derrotado! ${this.currentBoss.name}`);

    // Puntuación según el jefe
    const scoreValue = {
      'TIE_ADVANCED': SCORE_VALUES.TIE_ADVANCED,
      'STAR_DESTROYER': SCORE_VALUES.STAR_DESTROYER,
      'DEATH_STAR': SCORE_VALUES.DEATH_STAR
    }[this.currentBoss.type] || 5000;

    this.addScore(scoreValue);

    // Limpiar enemigos y balas
    this.enemies = [];
    this.enemyBullets = [];

    // Completar fase
    this.phaseManager.completePhase();
  }

  handleDeathStarSuperlaser() {
    // Efecto visual de superlaser
    // Si el jugador está en la línea del láser, recibe daño masivo

    const laserY = this.currentBoss.y + 200; // Centro de la Death Star
    const laserHeight = 50;

    if (this.player.y < laserY + laserHeight &&
        this.player.y + this.player.height > laserY) {

      // Jugador está en la línea del láser
      this.player.takeDamage(30);
      this.phaseManager.recordDamage(30);
      Utils.screenFlash(this.ctx, this.canvas, 'rgba(0, 255, 0, 0.5)', 100);
      Utils.screenShake(this.canvas, 20, 500);
    }

    // Dibujar el rayo en canvas
    this.drawSuperlaser(laserY, laserHeight);
  }

  drawSuperlaser(y, height) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = 0.8;

    // Rayo verde brillante
    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, this.currentBoss.x, height);

    // Glow effect
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#0f0';
    ctx.fillRect(0, y, this.currentBoss.x, height);

    ctx.restore();
  }
}
