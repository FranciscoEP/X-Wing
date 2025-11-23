// ============================================
// VISUAL EFFECTS - Efectos visuales avanzados
// ============================================

class VisualEffects {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.effects = [];
  }

  // ==========================================
  // SCREEN EFFECTS
  // ==========================================

  screenShake(intensity = 10, duration = 200) {
    const effect = {
      type: 'shake',
      intensity: intensity,
      duration: duration,
      elapsed: 0,
      originalTransform: this.canvas.style.transform
    };

    this.effects.push(effect);
  }

  screenFlash(color = 'rgba(255, 255, 255, 0.5)', duration = 100) {
    this.effects.push({
      type: 'flash',
      color: color,
      duration: duration,
      elapsed: 0
    });
  }

  chromatic(intensity = 5, duration = 200) {
    this.effects.push({
      type: 'chromatic',
      intensity: intensity,
      duration: duration,
      elapsed: 0
    });
  }

  // ==========================================
  // VIGNETTE
  // ==========================================

  drawVignette(alpha = 0.3) {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width / 4,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width / 1.5
    );

    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ==========================================
  // SCAN LINES
  // ==========================================

  drawScanLines(alpha = 0.1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#000000';

    for (let y = 0; y < this.canvas.height; y += 4) {
      this.ctx.fillRect(0, y, this.canvas.width, 2);
    }

    this.ctx.restore();
  }

  // ==========================================
  // LASER BEAM
  // ==========================================

  drawLaserBeam(x1, y1, x2, y2, color = '#00ff00', width = 5) {
    this.ctx.save();

    // Glow exterior
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.globalAlpha = 0.5;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Core brillante
    this.ctx.shadowBlur = 5;
    this.ctx.lineWidth = width / 2;
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = '#ffffff';

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // ==========================================
  // ENERGY SHIELD
  // ==========================================

  drawEnergyShield(x, y, radius, color = '#00ccff') {
    this.ctx.save();

    // Hexágono
    const sides = 6;
    const angle = (Math.PI * 2) / sides;

    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const px = x + Math.cos(angle * i) * radius;
      const py = y + Math.sin(angle * i) * radius;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();

    // Glow
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = color;
    this.ctx.globalAlpha = 0.6;
    this.ctx.stroke();

    // Fill semi-transparente
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = 0.2;
    this.ctx.fill();

    this.ctx.restore();
  }

  // ==========================================
  // DAMAGE INDICATOR
  // ==========================================

  drawDamageNumber(x, y, damage, color = '#ff0000') {
    this.effects.push({
      type: 'damage_number',
      x: x,
      y: y,
      damage: damage,
      color: color,
      life: 60,
      vy: -2
    });
  }

  // ==========================================
  // WARP EFFECT
  // ==========================================

  warpEffect(centerX, centerY, intensity = 10) {
    // Efecto de distorsión espacial
    this.effects.push({
      type: 'warp',
      centerX: centerX,
      centerY: centerY,
      intensity: intensity,
      radius: 0,
      maxRadius: 100,
      duration: 30,
      elapsed: 0
    });
  }

  // ==========================================
  // UPDATE & RENDER
  // ==========================================

  update() {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.elapsed++;

      switch(effect.type) {
        case 'shake':
          if (effect.elapsed < effect.duration) {
            const x = (Math.random() - 0.5) * effect.intensity;
            const y = (Math.random() - 0.5) * effect.intensity;
            this.canvas.style.transform = `translate(${x}px, ${y}px)`;
          } else {
            this.canvas.style.transform = effect.originalTransform || '';
            this.effects.splice(i, 1);
          }
          break;

        case 'damage_number':
          effect.y += effect.vy;
          effect.life--;
          if (effect.life <= 0) {
            this.effects.splice(i, 1);
          }
          break;

        case 'warp':
          effect.radius += effect.maxRadius / effect.duration;
          if (effect.elapsed >= effect.duration) {
            this.effects.splice(i, 1);
          }
          break;

        default:
          if (effect.elapsed >= effect.duration) {
            this.effects.splice(i, 1);
          }
      }
    }
  }

  render() {
    this.effects.forEach(effect => {
      switch(effect.type) {
        case 'flash':
          const alpha = 1 - (effect.elapsed / effect.duration);
          this.ctx.save();
          this.ctx.fillStyle = effect.color;
          this.ctx.globalAlpha = alpha;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.restore();
          break;

        case 'damage_number':
          this.ctx.save();
          this.ctx.fillStyle = effect.color;
          this.ctx.font = 'bold 20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.globalAlpha = effect.life / 60;
          this.ctx.fillText(`-${effect.damage}`, effect.x, effect.y);
          this.ctx.restore();
          break;

        case 'warp':
          this.ctx.save();
          this.ctx.strokeStyle = '#00ffff';
          this.ctx.lineWidth = 3;
          this.ctx.globalAlpha = 1 - (effect.elapsed / effect.duration);
          this.ctx.beginPath();
          this.ctx.arc(effect.centerX, effect.centerY, effect.radius, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
          break;
      }
    });
  }

  clear() {
    this.effects = [];
    this.canvas.style.transform = '';
  }
}
