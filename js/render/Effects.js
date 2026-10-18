import { rand } from '../core/utils.js';

/** Sacudida de cámara y destellos de pantalla completa. */
export class Effects {
  constructor() {
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.flashColor = '#fff';
    this.flashTime = 0;
    this.flashDuration = 0;
  }

  shake(intensity, duration) {
    // No reemplazar una sacudida más fuerte en curso
    if (this.shakeTime > 0 && intensity < this.shakeIntensity) return;
    this.shakeIntensity = intensity;
    this.shakeDuration = this.shakeTime = duration;
  }

  flash(color, duration) {
    this.flashColor = color;
    this.flashDuration = this.flashTime = duration;
  }

  update(dt) {
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
  }

  applyShake(ctx) {
    if (this.shakeTime <= 0) return;
    const k = this.shakeIntensity * (this.shakeTime / this.shakeDuration);
    ctx.translate(rand(-k, k), rand(-k, k));
  }

  drawFlash(ctx, width, height) {
    if (this.flashTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = (this.flashTime / this.flashDuration) * 0.6;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
