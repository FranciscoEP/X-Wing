import { rand } from '../core/utils.js';

const EXPLOSION_COLORS = ['#fff3b0', '#ffb347', '#ff6b35', '#e63946', '#888'];

/** Partículas y textos flotantes. Todo se actualiza con dt en segundos. */
export class Particles {
  constructor() {
    this.items = [];
    this.texts = [];
  }

  clear() {
    this.items.length = 0;
    this.texts.length = 0;
  }

  explosion(x, y, { count = 30, speed = 260, size = 3, colors = EXPLOSION_COLORS } = {}) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.2, 1) * speed;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(0.4, 0.9),
        maxLife: 0.9,
        size: rand(1, size),
        color: colors[Math.floor(rand(0, colors.length))],
      });
    }
  }

  sparks(x, y, color = '#ffd23c', count = 6) {
    this.explosion(x, y, { count, speed: 180, size: 2, colors: [color, '#fff'] });
  }

  text(x, y, value, color = '#ffe81f') {
    this.texts.push({ x, y, value, color, life: 1 });
  }

  update(dt) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2 * dt;
      p.vy *= 1 - 2 * dt;
      p.life -= dt;
    }
    for (const t of this.texts) {
      t.y -= 40 * dt;
      t.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 14px "Orbitron", monospace';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.restore();
  }
}
