// ============================================
// PAUSE SCREEN - Pantalla de pausa mejorada
// ============================================

class PauseScreen {
  constructor() {
    this.active = false;
    this.selectedOption = 0;
    this.options = [
      { label: 'Continuar', action: 'resume' },
      { label: 'Reiniciar Fase', action: 'restart_phase' },
      { label: 'Menú Principal', action: 'main_menu' }
    ];
  }

  show() {
    this.active = true;
    this.selectedOption = 0;
  }

  hide() {
    this.active = false;
  }

  moveUp() {
    if (this.selectedOption > 0) {
      this.selectedOption--;
    }
  }

  moveDown() {
    if (this.selectedOption < this.options.length - 1) {
      this.selectedOption++;
    }
  }

  getSelectedAction() {
    return this.options[this.selectedOption].action;
  }

  draw(ctx, canvas) {
    if (!this.active) return;

    // Overlay oscuro
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    Utils.drawTextWithShadow(ctx, 'PAUSA', canvas.width / 2, 150, '#ffffff', '#000000');

    // Opciones
    const startY = canvas.height / 2 - 50;
    const spacing = 60;

    this.options.forEach((option, index) => {
      const y = startY + index * spacing;
      const isSelected = index === this.selectedOption;

      // Fondo de opción seleccionada
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        const boxWidth = 250;
        const boxHeight = 45;
        Utils.drawRoundedRect(
          ctx,
          canvas.width / 2 - boxWidth / 2,
          y - boxHeight / 2,
          boxWidth,
          boxHeight,
          10,
          'rgba(255, 255, 255, 0.2)',
          '#ffffff'
        );
      }

      // Texto de opción
      ctx.font = isSelected ? 'bold 32px Arial' : '28px Arial';
      ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
      ctx.fillText(option.label, canvas.width / 2, y);

      // Indicador de selección
      if (isSelected) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('►', canvas.width / 2 - 140, y);
      }
    });

    // Controles
    ctx.font = '16px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('W/S - Navegar | J/Enter - Seleccionar | P/Esc - Cerrar', canvas.width / 2, canvas.height - 40);

    // Estadísticas del jugador
    ctx.font = '14px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'left';
    ctx.fillText('Estadísticas actuales:', 50, canvas.height - 100);

    ctx.restore();
  }

  drawStats(ctx, player, score, phase) {
    if (!this.active) return;

    ctx.save();
    ctx.font = '14px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'left';

    const x = 50;
    let y = 350;
    const lineHeight = 20;

    const stats = [
      `Vidas: ${player.lives}`,
      `HP: ${Math.ceil(player.hp)} / ${player.maxHP}`,
      `Puntuación: ${Utils.formatNumber(score)}`,
      `Fase: ${phase ? phase.id : '?'} - ${phase ? phase.name : '---'}`,
      `Power-ups activos: ${player.activePowerUps.length}`
    ];

    stats.forEach((stat, index) => {
      ctx.fillText(stat, x, y + index * lineHeight);
    });

    ctx.restore();
  }
}
