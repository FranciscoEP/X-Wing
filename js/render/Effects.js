import { rand } from '../core/utils.js';

/** Sacudida de cámara (en píxeles enteros, para no romper la cuadrícula) y destellos de pantalla. */
export class Effects {
  constructor() {
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.flashColor = '#fff';
    this.flashTime = 0;
    this.flashDuration = 0;
  }

  /** `intensity` en unidades de simulación (se dibuja a la mitad, en píxeles enteros). */
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

  /** Desplazamiento de cámara de este frame, en píxeles enteros. */
  shakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const k = (this.shakeIntensity / 2) * (this.shakeTime / this.shakeDuration);
    return { x: Math.round(rand(-k, k)), y: Math.round(rand(-k, k)) };
  }

  drawFlash(ctx, width, height) {
    if (this.flashTime <= 0) return;
    ctx.save();
    // Destello en escalones (como el parpadeo de un arcade), no un fundido suave
    ctx.globalAlpha = Math.ceil((this.flashTime / this.flashDuration) * 3) / 3 * 0.45;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
