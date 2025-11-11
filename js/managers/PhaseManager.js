// ============================================
// PHASE MANAGER - Control de fases del juego
// ============================================

class PhaseManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentPhaseIndex = 0;
    this.currentPhase = null;

    // Estadísticas de la fase actual
    this.phaseStats = {
      enemiesKilled: 0,
      enemiesSpawned: 0,
      powerUpsCollected: 0,
      damageReceived: 0,
      timeElapsed: 0,
      startHP: 0
    };

    // Estado de transición
    this.isTransitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 180; // 3 segundos a 60 FPS
    this.transitionType = null; // 'phase_complete', 'boss_intro', 'game_over', 'victory'
  }

  // ==========================================
  // CONTROL DE FASES
  // ==========================================

  startFirstPhase() {
    this.currentPhaseIndex = 0;
    this.loadPhase(0);
  }

  loadPhase(index) {
    if (index >= GAME_PHASES.length) {
      // Todas las fases completadas - Victoria
      this.gameManager.setState(GAME_STATES.VICTORY);
      return;
    }

    this.currentPhaseIndex = index;
    this.currentPhase = GAME_PHASES[index];

    console.log(`📍 Cargando Fase ${index + 1}: ${this.currentPhase.name}`);

    // Resetear estadísticas
    this.resetPhaseStats();

    // Configurar estado según el tipo de fase
    if (this.currentPhase.type === 'BOSS_FIGHT') {
      // Mostrar intro del jefe
      this.startBossIntro();
    } else {
      // Fase normal - comenzar directamente
      this.gameManager.setState(GAME_STATES.PLAYING);
    }
  }

  nextPhase() {
    this.loadPhase(this.currentPhaseIndex + 1);
  }

  // ==========================================
  // TRANSICIONES
  // ==========================================

  startTransition(type, data = {}) {
    console.log(`🎬 Iniciando transición: ${type}`);

    this.isTransitioning = true;
    this.transitionTimer = this.transitionDuration;
    this.transitionType = type;
    this.transitionData = data;

    // Pausar el juego durante la transición
    this.gameManager.isPaused = true;
  }

  updateTransition() {
    if (!this.isTransitioning) return;

    this.transitionTimer--;

    if (this.transitionTimer <= 0) {
      this.endTransition();
    }
  }

  endTransition() {
    this.isTransitioning = false;
    this.gameManager.isPaused = false;

    // Acción según el tipo de transición
    switch(this.transitionType) {
      case 'phase_complete':
        this.nextPhase();
        break;

      case 'boss_intro':
        this.gameManager.setState(GAME_STATES.BOSS_FIGHT);
        break;

      case 'game_over':
        this.gameManager.setState(GAME_STATES.GAME_OVER);
        break;

      case 'victory':
        this.gameManager.setState(GAME_STATES.VICTORY);
        break;
    }

    this.transitionType = null;
  }

  renderTransition(ctx) {
    if (!this.isTransitioning) return;

    const progress = 1 - (this.transitionTimer / this.transitionDuration);

    switch(this.transitionType) {
      case 'phase_complete':
        this.renderPhaseComplete(ctx, progress);
        break;

      case 'boss_intro':
        this.renderBossIntro(ctx, progress);
        break;

      case 'game_over':
        this.renderGameOverTransition(ctx, progress);
        break;

      case 'victory':
        this.renderVictoryTransition(ctx, progress);
        break;
    }
  }

  // ==========================================
  // RENDERIZADO DE TRANSICIONES
  // ==========================================

  renderPhaseComplete(ctx, progress) {
    const canvas = this.gameManager.canvas;

    // Fade in del overlay
    const alpha = Math.min(progress * 2, 0.8);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (progress < 0.2) return; // Esperar fade in

    ctx.save();

    // Título "PHASE COMPLETE"
    const titleY = Utils.lerp(-100, canvas.height / 2 - 100, Math.min(progress * 2, 1));
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    Utils.drawTextWithShadow(ctx, '¡FASE COMPLETADA!', canvas.width / 2, titleY, '#00ff00', '#003300');

    // Estadísticas de la fase
    if (progress > 0.4) {
      const statsY = canvas.height / 2 - 20;
      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffffff';

      const stats = [
        `Enemigos Eliminados: ${this.phaseStats.enemiesKilled}`,
        `Power-ups Recogidos: ${this.phaseStats.powerUpsCollected}`,
        `Tiempo: ${Math.floor(this.phaseStats.timeElapsed / 60)}s`,
        ``,
        `Bonus: +${this.calculatePhaseBonus()} pts`
      ];

      stats.forEach((stat, index) => {
        const statAlpha = Math.min((progress - 0.4 - index * 0.05) * 3, 1);
        if (statAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = statAlpha;
          ctx.fillText(stat, canvas.width / 2, statsY + index * 30);
          ctx.restore();
        }
      });
    }

    // "Próxima fase..."
    if (progress > 0.8) {
      const nextPhaseAlpha = (progress - 0.8) * 5;
      ctx.save();
      ctx.globalAlpha = nextPhaseAlpha;
      ctx.font = '18px Arial';
      ctx.fillStyle = '#ffff00';
      ctx.fillText('Preparándose para la próxima fase...', canvas.width / 2, canvas.height - 80);
      ctx.restore();
    }

    ctx.restore();
  }

  renderBossIntro(ctx, progress) {
    const canvas = this.gameManager.canvas;

    // Fade in dramático
    const alpha = Math.min(progress * 2, 0.9);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (progress < 0.15) return;

    ctx.save();

    // Alerta parpadeante
    if (Math.floor(progress * 20) % 2 === 0) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      Utils.drawTextWithShadow(ctx, '⚠ ALERTA ⚠', canvas.width / 2, 80, '#ff0000', '#330000');
    }

    // Nombre del jefe
    const titleY = Utils.lerp(-150, canvas.height / 2 - 50, Math.min((progress - 0.2) * 2, 1));
    if (progress > 0.2) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      Utils.drawTextWithShadow(
        ctx,
        this.currentPhase.name.toUpperCase(),
        canvas.width / 2,
        titleY,
        '#ff0000',
        '#330000'
      );
    }

    // Objetivo
    if (progress > 0.5) {
      const objectiveAlpha = Math.min((progress - 0.5) * 2, 1);
      ctx.save();
      ctx.globalAlpha = objectiveAlpha;
      ctx.font = '24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.currentPhase.objective, canvas.width / 2, canvas.height / 2 + 20);
      ctx.restore();
    }

    // ASCII Art del jefe (simple)
    if (progress > 0.6) {
      const artAlpha = Math.min((progress - 0.6) * 2.5, 1);
      ctx.save();
      ctx.globalAlpha = artAlpha;
      ctx.font = '16px Courier';
      ctx.fillStyle = '#666666';

      const art = this.getBossAsciiArt();
      art.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, canvas.height / 2 + 60 + index * 18);
      });
      ctx.restore();
    }

    // "¡Prepárate!"
    if (progress > 0.85) {
      const readyAlpha = (progress - 0.85) * 6.67;
      ctx.save();
      ctx.globalAlpha = readyAlpha;
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ffff00';
      ctx.fillText('¡PREPÁRATE PARA EL COMBATE!', canvas.width / 2, canvas.height - 60);
      ctx.restore();
    }

    ctx.restore();
  }

  renderGameOverTransition(ctx, progress) {
    const canvas = this.gameManager.canvas;

    // Fade a negro
    const alpha = progress * 0.9;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  renderVictoryTransition(ctx, progress) {
    const canvas = this.gameManager.canvas;

    // Fade a blanco brillante
    const alpha = progress * 0.8;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ==========================================
  // ESTADÍSTICAS Y BONUS
  // ==========================================

  resetPhaseStats() {
    this.phaseStats = {
      enemiesKilled: 0,
      enemiesSpawned: 0,
      powerUpsCollected: 0,
      damageReceived: 0,
      timeElapsed: 0,
      startHP: this.gameManager.player.hp
    };
  }

  updatePhaseStats() {
    this.phaseStats.timeElapsed++;
  }

  recordEnemyKilled() {
    this.phaseStats.enemiesKilled++;
  }

  recordPowerUpCollected() {
    this.phaseStats.powerUpsCollected++;
  }

  recordDamage(amount) {
    this.phaseStats.damageReceived += amount;
  }

  calculatePhaseBonus() {
    let bonus = SCORE_VALUES.PHASE_COMPLETE_BONUS;

    // Bonus por no recibir daño
    if (this.phaseStats.damageReceived === 0) {
      bonus += SCORE_VALUES.NO_DAMAGE_BONUS;
    }

    // Bonus por tiempo (menos tiempo = más bonus)
    const timeBonus = Math.max(0, 500 - Math.floor(this.phaseStats.timeElapsed / 6));
    bonus += timeBonus;

    return bonus;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  startBossIntro() {
    this.startTransition('boss_intro', {
      bossName: this.currentPhase.name,
      bossType: this.currentPhase.bossType
    });
  }

  completePhase() {
    // Aplicar bonus
    const bonus = this.calculatePhaseBonus();
    this.gameManager.addScore(bonus);

    // Iniciar transición de fase completada
    this.startTransition('phase_complete');
  }

  getBossAsciiArt() {
    // ASCII art simple según el tipo de jefe
    const bossType = this.currentPhase.bossType;

    switch(bossType) {
      case 'TIE_ADVANCED':
        return [
          '    ╔═══╗',
          '  ┌─┤ ◉ ├─┐',
          '  └─┤   ├─┘',
          '    ╚═══╝'
        ];

      case 'STAR_DESTROYER':
        return [
          '      ▲',
          '     ╱│╲',
          '    ╱ │ ╲',
          '   ╱  │  ╲',
          '  ╱───┴───╲',
          ' ═══════════'
        ];

      case 'DEATH_STAR':
        return [
          '   ╔═════╗',
          '  ╔╝ ┌─┐ ╚╗',
          '  ║  │▓│  ║',
          '  ╚╗ └─┘ ╔╝',
          '   ╚═════╝'
        ];

      default:
        return ['', '  ??? ', ''];
    }
  }

  getCurrentPhase() {
    return this.currentPhase;
  }

  getPhaseProgress() {
    if (!this.currentPhase) return 0;

    if (this.currentPhase.type === 'NORMAL_COMBAT') {
      return this.phaseStats.enemiesKilled / this.currentPhase.enemyCount;
    }

    return 0; // Boss fights no tienen progress bar
  }

  isPhaseComplete() {
    if (!this.currentPhase) return false;

    if (this.currentPhase.type === 'NORMAL_COMBAT') {
      return this.phaseStats.enemiesKilled >= this.currentPhase.enemyCount;
    }

    // Boss fights se completan cuando el jefe muere (manejado externamente)
    return false;
  }
}
