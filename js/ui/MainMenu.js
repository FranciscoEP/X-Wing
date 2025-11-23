// ============================================
// MAIN MENU - Menú principal mejorado
// ============================================

class MainMenu {
  constructor() {
    this.active = false;
    this.selectedOption = 0;
    this.selectedDifficulty = 1; // 0=Easy, 1=Normal, 2=Hard
    this.state = 'main'; // 'main', 'difficulty', 'instructions', 'credits'

    this.mainOptions = [
      { label: 'Jugar', action: 'play' },
      { label: 'Dificultad', action: 'difficulty' },
      { label: 'Instrucciones', action: 'instructions' },
      { label: 'Créditos', action: 'credits' }
    ];

    this.difficulties = [
      { name: 'Piloto Novato', key: 'EASY', color: '#00ff00' },
      { name: 'Piloto Rebelde', key: 'NORMAL', color: '#ffff00' },
      { name: 'As de la Alianza', key: 'HARD', color: '#ff0000' }
    ];

    this.animationFrame = 0;
  }

  show() {
    this.active = true;
    this.state = 'main';
    this.selectedOption = 0;
  }

  hide() {
    this.active = false;
  }

  moveUp() {
    if (this.state === 'main') {
      if (this.selectedOption > 0) {
        this.selectedOption--;
      }
    } else if (this.state === 'difficulty') {
      if (this.selectedDifficulty > 0) {
        this.selectedDifficulty--;
      }
    }
  }

  moveDown() {
    if (this.state === 'main') {
      if (this.selectedOption < this.mainOptions.length - 1) {
        this.selectedOption++;
      }
    } else if (this.state === 'difficulty') {
      if (this.selectedDifficulty < this.difficulties.length - 1) {
        this.selectedDifficulty++;
      }
    }
  }

  select() {
    if (this.state === 'main') {
      const action = this.mainOptions[this.selectedOption].action;

      switch(action) {
        case 'play':
          return 'start_game';
        case 'difficulty':
          this.state = 'difficulty';
          break;
        case 'instructions':
          this.state = 'instructions';
          break;
        case 'credits':
          this.state = 'credits';
          break;
      }
    } else if (this.state === 'difficulty') {
      return 'difficulty_selected';
    }

    return null;
  }

  back() {
    if (this.state !== 'main') {
      this.state = 'main';
      return true;
    }
    return false;
  }

  getSelectedDifficulty() {
    return this.difficulties[this.selectedDifficulty].key;
  }

  update() {
    this.animationFrame++;
  }

  draw(ctx, canvas) {
    if (!this.active) return;

    ctx.save();

    // Fondo oscuro con estrellas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    switch(this.state) {
      case 'main':
        this.drawMainMenu(ctx, canvas);
        break;
      case 'difficulty':
        this.drawDifficultyMenu(ctx, canvas);
        break;
      case 'instructions':
        this.drawInstructions(ctx, canvas);
        break;
      case 'credits':
        this.drawCredits(ctx, canvas);
        break;
    }

    ctx.restore();
  }

  drawMainMenu(ctx, canvas) {
    // Título con animación
    const titleY = 100 + Math.sin(this.animationFrame * 0.05) * 5;

    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';

    // Sombra del título
    ctx.fillStyle = '#003366';
    ctx.fillText('X-WING', canvas.width / 2 + 3, titleY + 3);

    // Título principal
    const gradient = ctx.createLinearGradient(0, titleY - 30, 0, titleY + 30);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#66ccff');
    gradient.addColorStop(1, '#0066cc');
    ctx.fillStyle = gradient;
    ctx.fillText('X-WING', canvas.width / 2, titleY);

    // Subtítulo
    ctx.font = '20px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Asalto a la Estrella de la Muerte', canvas.width / 2, titleY + 40);

    // Opciones del menú
    const startY = 250;
    const spacing = 60;

    this.mainOptions.forEach((option, index) => {
      const y = startY + index * spacing;
      const isSelected = index === this.selectedOption;

      if (isSelected) {
        // Fondo brillante para opción seleccionada
        const pulse = Math.sin(this.animationFrame * 0.1) * 0.1 + 0.9;
        ctx.globalAlpha = pulse;

        Utils.drawRoundedRect(
          ctx,
          canvas.width / 2 - 150,
          y - 25,
          300,
          45,
          10,
          'rgba(255, 255, 0, 0.2)',
          '#ffff00'
        );

        ctx.globalAlpha = 1;
      }

      // Texto
      ctx.font = isSelected ? 'bold 32px Arial' : '28px Arial';
      ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
      ctx.fillText(option.label, canvas.width / 2, y);

      // Flecha para opción seleccionada
      if (isSelected) {
        const arrowX = canvas.width / 2 - 170 + Math.sin(this.animationFrame * 0.15) * 5;
        ctx.fillText('►', arrowX, y);
      }
    });

    // Controles
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('W/S - Navegar | J/Enter - Seleccionar', canvas.width / 2, canvas.height - 30);
  }

  drawDifficultyMenu(ctx, canvas) {
    // Título
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Selecciona Dificultad', canvas.width / 2, 100);

    // Dificultades
    const startY = 200;
    const spacing = 120;

    this.difficulties.forEach((diff, index) => {
      const y = startY + index * spacing;
      const isSelected = index === this.selectedDifficulty;

      // Caja de dificultad
      const boxAlpha = isSelected ? 0.4 : 0.2;
      Utils.drawRoundedRect(
        ctx,
        canvas.width / 2 - 200,
        y - 40,
        400,
        80,
        15,
        `rgba(255, 255, 255, ${boxAlpha})`,
        isSelected ? diff.color : '#666666'
      );

      // Nombre de dificultad
      ctx.font = isSelected ? 'bold 32px Arial' : '28px Arial';
      ctx.fillStyle = diff.color;
      ctx.fillText(diff.name, canvas.width / 2, y);

      // Detalles
      if (isSelected) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#cccccc';
        const details = this.getDifficultyDetails(diff.key);
        ctx.fillText(details, canvas.width / 2, y + 25);
      }

      // Flecha
      if (isSelected) {
        ctx.fillStyle = diff.color;
        ctx.font = 'bold 30px Arial';
        ctx.fillText('►', canvas.width / 2 - 220, y);
      }
    });

    // Controles
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('W/S - Cambiar | J/Enter - Confirmar | Esc - Volver', canvas.width / 2, canvas.height - 30);
  }

  getDifficultyDetails(difficulty) {
    const details = {
      'EASY': 'Vidas: 5 | Enemigos: Lentos | Power-ups: Frecuentes',
      'NORMAL': 'Vidas: 3 | Enemigos: Normal | Power-ups: Normal',
      'HARD': 'Vidas: 2 | Enemigos: Rápidos | Power-ups: Raros'
    };
    return details[difficulty] || '';
  }

  drawInstructions(ctx, canvas) {
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Instrucciones', canvas.width / 2, 80);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'left';

    const instructions = [
      'OBJETIVO:',
      '  • Derrota a los enemigos imperiales',
      '  • Sobrevive a 5 fases épicas',
      '  • Destruye la Estrella de la Muerte',
      '',
      'CONTROLES:',
      '  • W A S D - Mover nave',
      '  • J - Disparar',
      '  • P / Esc - Pausa',
      '',
      'POWER-UPS:',
      '  • Aparecen al destruir enemigos',
      '  • 15 tipos diferentes',
      '  • Algunos son temporales, otros instantáneos',
      '',
      'JEFES:',
      '  • TIE Advanced - Dash Attack',
      '  • Star Destroyer - Spawn TIEs',
      '  • Death Star - Superlaser + Weak Point'
    ];

    let y = 140;
    instructions.forEach(line => {
      ctx.fillText(line, 80, y);
      y += 25;
    });

    // Controles
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Esc - Volver', canvas.width / 2, canvas.height - 30);
  }

  drawCredits(ctx, canvas) {
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Créditos', canvas.width / 2, 80);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#cccccc';

    const credits = [
      '',
      'Desarrollo',
      'Claude AI + Usuario',
      '',
      'Concepto Original',
      'Star Wars © Lucasfilm',
      '',
      'Tecnología',
      'Vanilla JavaScript',
      'HTML5 Canvas',
      'CSS3 Animations',
      '',
      'Fase 0-5',
      'Sistema Modular Completo',
      '~6000 líneas de código',
      '',
      'Mayo de 2025'
    ];

    let y = 140;
    credits.forEach(line => {
      if (line === '') {
        y += 15;
      } else {
        ctx.fillText(line, canvas.width / 2, y);
        y += 30;
      }
    });

    // Controles
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('Esc - Volver', canvas.width / 2, canvas.height - 30);
  }
}
