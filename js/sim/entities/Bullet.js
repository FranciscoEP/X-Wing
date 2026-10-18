import { Entity } from './Entity.js';

const OFFSCREEN_MARGIN = 40;

export class Bullet extends Entity {
  /** `x`, `y` son el centro del proyectil. */
  constructor(x, y, vx, vy, { damage, friendly, color = null, length = 22, thickness = 3 }) {
    super(x - length / 2, y - thickness / 2, length, thickness);
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.friendly = friendly;
    this.color = color; // null = color por defecto del bando (lo decide el renderer)
    this.length = length;
    this.thickness = thickness;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.isOffScreen(OFFSCREEN_MARGIN)) this.dead = true;
  }
}
