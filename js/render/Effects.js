import { rand } from '../core/utils.js';

const MAX_WAVES = 8;

/**
 * Efectos de cámara: sacudida y destello (canvas 2D) y, para el post-procesado WebGL,
 * ondas expansivas de distorsión. Solo estado: las ondas las dibuja PostFX.
 */
export class Effects {
  constructor() {
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.flashColor = '#fff';
    this.flashTime = 0;
    this.flashDuration = 0;
    this.waves = [];
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

  /** Onda que se expande desde (x, y) hasta `radius` px en `duration` s. */
  wave(x, y, { radius = 200, duration = 0.6, strength = 1 } = {}) {
    this.waves.push({ x, y, maxRadius: radius, duration, strength, age: 0 });
    if (this.waves.length > MAX_WAVES) this.waves.shift();
  }

  update(dt) {
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
    for (const w of this.waves) w.age += dt;
    this.waves = this.waves.filter((w) => w.age < w.duration);
  }

  /** Estado para PostFX: ondas con su radio actual y fuerza decreciente. */
  postState() {
    return {
      waves: this.waves.map((w) => {
        const p = w.age / w.duration;
        return { x: w.x, y: w.y, radius: w.maxRadius * p, strength: w.strength * (1 - p) };
      }),
    };
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
