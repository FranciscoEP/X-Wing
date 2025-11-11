// ============================================
// HUD - Interfaz de usuario (vidas, HP, score)
// ============================================

class HUD {
  constructor() {
    this.padding = 10;
    this.barWidth = 200;
    this.barHeight = 20;
  }

  draw(ctx, player, score, phase) {
    this.drawHealthBar(ctx, player);
    this.drawLives(ctx, player);
    this.drawScore(ctx, score);
    this.drawPhaseInfo(ctx, phase);
    this.drawActivePowerUps(ctx, player);
  }

  drawHealthBar(ctx, player) {
    const x = this.padding;
    const y = this.padding;
    const hpPercent = player.getHPPercent();

    ctx.save();

    // Fondo de la barra
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, this.barWidth, this.barHeight);

    // Barra de HP (color según porcentaje)
    let hpColor = '#00ff00'; // Verde
    if (hpPercent < 0.5) hpColor = '#ffff00'; // Amarillo
    if (hpPercent < 0.25) hpColor = '#ff0000'; // Rojo

    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, this.barWidth * hpPercent, this.barHeight);

    // Borde
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.barWidth, this.barHeight);

    // Texto HP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `HP: ${Math.ceil(player.hp)} / ${player.maxHP}`,
      x + this.barWidth / 2,
      y + this.barHeight / 2
    );

    ctx.restore();
  }

  drawLives(ctx, player) {
    const x = this.padding;
    const y = this.padding + this.barHeight + 10;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Vidas: ${player.lives}`, x, y);

    // Dibujar iconos de vidas
    for (let i = 0; i < player.lives; i++) {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x + 70 + (i * 25), y - 5, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawScore(ctx, score) {
    const x = GAME_CONFIG.CANVAS_WIDTH - this.padding;
    const y = this.padding + 20;

    ctx.save();
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${Utils.formatNumber(score)}`, x, y);
    ctx.restore();
  }

  drawPhaseInfo(ctx, phase) {
    if (!phase) return;

    const x = GAME_CONFIG.CANVAS_WIDTH - this.padding;
    const y = this.padding + 50;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Fase ${phase.id}: ${phase.name}`, x, y);
    ctx.fillText(phase.objective, x, y + 18);
    ctx.restore();
  }

  drawActivePowerUps(ctx, player) {
    if (player.activePowerUps.length === 0) return;

    const x = this.padding;
    const y = GAME_CONFIG.CANVAS_HEIGHT - 40;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Power-Ups Activos:', x, y);

    // Dibujar cada power-up activo
    player.activePowerUps.forEach((powerUp, index) => {
      const config = POWERUP_TYPES[powerUp.type];
      const px = x + (index * 60);
      const py = y + 10;

      // Icono
      ctx.fillStyle = config.color;
      ctx.fillRect(px, py, 50, 15);

      // Nombre abreviado
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        config.name.substring(0, 8),
        px + 25,
        py + 10
      );

      // Tiempo restante
      const timeLeft = Math.ceil(powerUp.timer / 60);
      ctx.fillText(`${timeLeft}s`, px + 25, py + 22);
    });

    ctx.restore();
  }

  drawBossHealthBar(ctx, boss) {
    if (!boss || !boss.active) return;

    const x = GAME_CONFIG.CANVAS_WIDTH / 2 - 200;
    const y = GAME_CONFIG.CANVAS_HEIGHT - 40;
    const barWidth = 400;
    const barHeight = 25;
    const hpPercent = boss.hp / boss.maxHP;

    ctx.save();

    // Nombre del jefe
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name || 'BOSS', x + barWidth / 2, y - 10);

    // Fondo de la barra
    ctx.fillStyle = '#330000';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Barra de HP del jefe
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    // Borde
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Texto HP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(boss.hp)} / ${boss.maxHP}`,
      x + barWidth / 2,
      y + barHeight / 2
    );

    ctx.restore();
  }
}
