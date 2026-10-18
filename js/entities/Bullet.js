import { Entity } from './Entity.js';

/** Láser dibujado por código: rojo para la Alianza, verde para el Imperio. */
export class Bullet extends Entity {
  constructor(x, y, vx, vy, { damage, friendly, color, length = 22, thickness = 3 }) {
    super(x - length / 2, y - thickness / 2, length, thickness);
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.friendly = friendly;
    this.color = color ?? (friendly ? '#ff3b3b' : '#4dff6a');
    this.length = length;
    this.thickness = thickness;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.isOffScreen(40)) this.dead = true;
  }

  draw(ctx) {
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.length / 2, -this.thickness / 2, this.length, this.thickness);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-this.length / 2 + 2, -this.thickness / 4, this.length - 4, this.thickness / 2);
    ctx.restore();
  }
}
