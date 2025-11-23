// ============================================
// HUD ENHANCED - Interfaz mejorada con animaciones
// ============================================

class HUDEnhanced extends HUD {
  constructor() {
    super();
    this.animationFrame = 0;
    this.lowHPWarning = false;
    this.warningTimer = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.comboKills = 0;
  }

  update() {
    this.animationFrame++;

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) {
        this.resetCombo();
      }
    }

    // Warning flash
    if (this.warningTimer > 0) {
      this.warningTimer--;
    }
  }

  addComboKill() {
    this.comboKills++;
    this.comboTimer = 180; // 3 seconds
    this.comboMultiplier = Math.min(1 + (this.comboKills * 0.1), 3);
  }

  resetCombo() {
    this.comboKills = 0;
    this.comboMultiplier = 1;
  }

  draw(ctx, player, score, phase) {
    this.drawHealthBarEnhanced(ctx, player);
    this.drawLivesEnhanced(ctx, player);
    this.drawScoreEnhanced(ctx, score);
    this.drawPhaseInfoEnhanced(ctx, phase);
    this.drawActivePowerUpsEnhanced(ctx, player);

    // Combo indicator
    if (this.comboKills > 1) {
      this.drawCombo(ctx);
    }

    // Low HP warning
    if (player.getHPPercent() < 0.25) {
      this.drawLowHPWarning(ctx);
    }

    // Mini map (optional)
    // this.drawMiniMap(ctx, phase);
  }

  drawHealthBarEnhanced(ctx, player) {
    const x = this.padding;
    const y = this.padding;
    const hpPercent = player.getHPPercent();

    ctx.save();

    // Background bar con borde
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 2, y - 2, this.barWidth + 4, this.barHeight + 4);

    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, this.barWidth, this.barHeight);

    // HP bar con gradiente animado
    let hpColor;
    if (hpPercent < 0.25) {
      // Rojo parpadeante
      const flash = Math.sin(this.animationFrame * 0.3) * 0.3 + 0.7;
      hpColor = `rgba(255, 0, 0, ${flash})`;
      this.lowHPWarning = true;
    } else if (hpPercent < 0.5) {
      hpColor = '#ffaa00';
      this.lowHPWarning = false;
    } else {
      hpColor = '#00ff00';
      this.lowHPWarning = false;
    }

    // Gradiente para la barra de HP
    const gradient = ctx.createLinearGradient(x, y, x, y + this.barHeight);
    gradient.addColorStop(0, hpColor);
    gradient.addColorStop(1, this.adjustBrightness(hpColor, -0.3));

    ctx.fillStyle = gradient;

    // Animación de llenado suave
    const currentWidth = this.barWidth * hpPercent;
    ctx.fillRect(x, y, currentWidth, this.barHeight);

    // Brillo en la barra
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x, y, currentWidth, this.barHeight / 3);

    // Borde
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.barWidth, this.barHeight);

    // Texto HP con sombra
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(
      `HP: ${Math.ceil(player.hp)}`,
      x + this.barWidth / 2,
      y + this.barHeight / 2
    );

    ctx.restore();
  }

  drawLivesEnhanced(ctx, player) {
    const x = this.padding;
    const y = this.padding + this.barHeight + 15;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText('Vidas:', x, y);

    // Iconos de vidas con animación
    for (let i = 0; i < player.lives; i++) {
      const iconX = x + 60 + (i * 30);
      const iconY = y - 5;
      const pulse = 1 + Math.sin(this.animationFrame * 0.1 + i) * 0.1;

      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(iconX, iconY, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Brillo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(iconX - 2, iconY - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawScoreEnhanced(ctx, score) {
    const x = GAME_CONFIG.CANVAS_WIDTH - this.padding;
    const y = this.padding + 25;

    ctx.save();

    // Fondo del score
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 200, y - 30, 195, 35);

    // Score con efecto dorado
    const gradient = ctx.createLinearGradient(x - 100, y - 20, x - 100, y + 20);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(0.5, '#ffcc00');
    gradient.addColorStop(1, '#ff9900');

    ctx.fillStyle = gradient;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'right';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    ctx.fillText(Utils.formatNumber(score), x, y);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Arial';
    ctx.fillText('SCORE', x, y - 18);

    ctx.restore();
  }

  drawPhaseInfoEnhanced(ctx, phase) {
    if (!phase) return;

    const x = GAME_CONFIG.CANVAS_WIDTH - this.padding;
    const y = this.padding + 65;

    ctx.save();

    // Fondo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 280, y - 25, 275, 50);

    // Fase actual
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(`FASE ${phase.id}`, x, y);

    // Nombre de la fase
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(phase.name, x, y + 18);

    ctx.restore();
  }

  drawActivePowerUpsEnhanced(ctx, player) {
    if (player.activePowerUps.length === 0) return;

    const x = this.padding;
    const y = GAME_CONFIG.CANVAS_HEIGHT - 50;

    ctx.save();

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText('POWER-UPS:', x, y - 5);

    // Cada power-up activo
    player.activePowerUps.forEach((powerUp, index) => {
      const config = POWERUP_TYPES[powerUp.type];
      const px = x + (index * 120);
      const py = y + 5;
      const timePercent = powerUp.timer / (config.duration * 60 / 1000);

      // Fondo del power-up
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(px, py, 110, 30);

      // Barra de tiempo
      ctx.fillStyle = config.color;
      ctx.fillRect(px + 2, py + 2, 106 * timePercent, 4);

      // Icono (primera letra)
      ctx.fillStyle = config.color;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 5;
      ctx.fillText(config.name[0], px + 5, py + 20);

      // Nombre abreviado
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.shadowBlur = 2;
      ctx.fillText(config.name.substring(0, 10), px + 25, py + 16);

      // Tiempo restante
      const timeLeft = Math.ceil(powerUp.timer / 60);
      ctx.fillStyle = '#cccccc';
      ctx.font = '9px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${timeLeft}s`, px + 108, py + 26);
    });

    ctx.restore();
  }

  drawCombo(ctx) {
    const x = GAME_CONFIG.CANVAS_WIDTH / 2;
    const y = 100;

    ctx.save();

    // Efecto de escala pulsante
    const scale = 1 + Math.sin(this.animationFrame * 0.2) * 0.1;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    // Combo multiplicador
    const gradient = ctx.createLinearGradient(x - 50, y - 20, x + 50, y + 20);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, '#ffff00');

    ctx.fillStyle = gradient;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText(`COMBO x${this.comboMultiplier.toFixed(1)}`, x, y);

    // Kills count
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`${this.comboKills} kills`, x, y + 25);

    ctx.restore();
  }

  drawLowHPWarning(ctx) {
    if (!this.lowHPWarning) return;

    const alpha = Math.sin(this.animationFrame * 0.2) * 0.3 + 0.3;

    ctx.save();

    // Bordes rojos parpadeantes
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, GAME_CONFIG.CANVAS_WIDTH - 10, GAME_CONFIG.CANVAS_HEIGHT - 10);

    // Texto de advertencia
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡HP CRÍTICO!', GAME_CONFIG.CANVAS_WIDTH / 2, 50);

    ctx.restore();
  }

  adjustBrightness(color, amount) {
    // Helper para ajustar brillo de colores
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount * 255));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount * 255));
      const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount * 255));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }
}
