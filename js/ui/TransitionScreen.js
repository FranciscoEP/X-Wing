// ============================================
// TRANSITION SCREEN - Pantallas de transición
// ============================================

class TransitionScreen {
  constructor() {
    this.active = false;
    this.type = null;
    this.timer = 0;
    this.duration = 0;
    this.data = {};
  }

  start(type, duration = 180, data = {}) {
    this.active = true;
    this.type = type;
    this.timer = 0;
    this.duration = duration;
    this.data = data;
  }

  update() {
    if (!this.active) return;

    this.timer++;

    if (this.timer >= this.duration) {
      this.active = false;
      return true; // Transición completada
    }

    return false;
  }

  draw(ctx, canvas) {
    if (!this.active) return;

    const progress = this.timer / this.duration;

    switch(this.type) {
      case 'fade_in':
        this.drawFadeIn(ctx, canvas, progress);
        break;

      case 'fade_out':
        this.drawFadeOut(ctx, canvas, progress);
        break;

      case 'wipe_left':
        this.drawWipeLeft(ctx, canvas, progress);
        break;

      case 'wipe_right':
        this.drawWipeRight(ctx, canvas, progress);
        break;

      case 'zoom_in':
        this.drawZoomIn(ctx, canvas, progress);
        break;

      default:
        this.drawFadeIn(ctx, canvas, progress);
    }
  }

  // ==========================================
  // EFECTOS DE TRANSICIÓN
  // ==========================================

  drawFadeIn(ctx, canvas, progress) {
    const alpha = 1 - progress;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawFadeOut(ctx, canvas, progress) {
    const alpha = progress;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawWipeLeft(ctx, canvas, progress) {
    const x = canvas.width * (1 - progress);
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, 0, canvas.width - x, canvas.height);
    ctx.restore();
  }

  drawWipeRight(ctx, canvas, progress) {
    const width = canvas.width * progress;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, canvas.height);
    ctx.restore();
  }

  drawZoomIn(ctx, canvas, progress) {
    const scale = 1 + progress * 2;
    const alpha = progress * 0.5;

    ctx.save();

    // Zoom effect
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Fade overlay
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
  }

  isActive() {
    return this.active;
  }

  end() {
    this.active = false;
  }
}
