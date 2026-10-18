import { rand } from '../core/utils.js';
import { PAL } from './art/palette.js';
import { circle, px, rect, ring, text } from './pixel.js';

// Explosión pixel: bola que crece y se enfría (blanco → amarillo → naranja → rojo → humo)
const BLAST_STEPS = [PAL.white, PAL.yellow, PAL.orange, PAL.red, PAL.dark];
const SPARK_COLORS = [PAL.white, PAL.yellow, PAL.orange];

/**
 * Efectos de partículas en pixel art. Las posiciones se guardan en unidades de simulación y se
 * pasan a píxeles al dibujar. Todo caduca solo (ver tests/memory.test.js).
 */
export class Particles {
  constructor() {
    this.items = [];
    this.texts = [];
    this.waves = [];
    this.blasts = [];
  }

  clear() {
    this.items.length = 0;
    this.texts.length = 0;
    this.waves.length = 0;
    this.blasts.length = 0;
  }

  /** Bola de fuego animada en 5 pasos + chispas. `size` = radio máximo en píxeles. */
  explosion(x, y, { count = 14, speed = 220, size = 7 } = {}) {
    this.blasts.push({ x, y, size, life: 0.45, maxLife: 0.45 });
    this.sparks(x, y, PAL.yellow, count, speed);
  }

  sparks(x, y, color = PAL.yellow, count = 5, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.3, 1) * speed;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(0.25, 0.6),
        color: i % 3 === 0 ? color : SPARK_COLORS[i % SPARK_COLORS.length],
      });
    }
  }

  /** Anillo que se expande hasta `radius` (unidades de simulación). */
  shockwave(x, y, radius, color = PAL.cyan, duration = 0.4) {
    this.waves.push({ x, y, radius, color, life: duration, duration });
  }

  text(x, y, value, color = PAL.yellow) {
    this.texts.push({ x, y, value, color, life: 0.9 });
  }

  update(dt) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
      p.life -= dt;
    }
    for (const t of this.texts) {
      t.y -= 50 * dt;
      t.life -= dt;
    }
    for (const w of this.waves) w.life -= dt;
    for (const b of this.blasts) b.life -= dt;
    this.items = this.items.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
    this.waves = this.waves.filter((w) => w.life > 0);
    this.blasts = this.blasts.filter((b) => b.life > 0);
  }

  draw(ctx) {
    for (const b of this.blasts) {
      const p = 1 - b.life / b.maxLife;
      const step = Math.min(BLAST_STEPS.length - 1, Math.floor(p * BLAST_STEPS.length));
      const r = Math.round(b.size * (0.4 + p * 0.8));
      circle(ctx, px(b.x), px(b.y), r, BLAST_STEPS[Math.min(BLAST_STEPS.length - 1, step + 1)]);
      circle(ctx, px(b.x), px(b.y), Math.max(0, r - 2), BLAST_STEPS[step]);
    }
    for (const w of this.waves) {
      const p = 1 - w.life / w.duration;
      ring(ctx, px(w.x), px(w.y), Math.round(px(w.radius) * p), w.color, { dash: p > 0.6 ? 2 : 0 });
    }
    for (const s of this.items) rect(ctx, px(s.x), px(s.y), 1, 1, s.color);
    for (const t of this.texts) text(ctx, t.value, px(t.x), px(t.y), t.color);
  }
}
