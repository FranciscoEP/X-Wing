import { POWERUPS } from '../config.js';
import { Entity } from './Entity.js';

export class PowerUp extends Entity {
  constructor(type, x, y) {
    super(x - 14, y - 14, 28, 28);
    this.type = type;
    this.cfg = POWERUPS[type];
    this.age = 0;
    this.lifetime = 10;
    this.baseY = this.y;
  }

  update(dt) {
    this.age += dt;
    this.x -= 60 * dt;
    this.y = this.baseY + Math.sin(this.age * 3) * 6;
    if (this.age > this.lifetime || this.isOffScreen()) this.dead = true;
  }

  draw(ctx) {
    // Parpadea durante los últimos 3 segundos
    if (this.lifetime - this.age < 3 && Math.floor(this.age * 8) % 2 === 0) return;
    const r = this.width / 2;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.shadowColor = this.cfg.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(10, 14, 30, 0.85)';
    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(this.age * 2);
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = this.cfg.color;
    ctx.font = 'bold 13px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.cfg.icon, this.cx, this.cy + 1);
    ctx.restore();
  }
}
