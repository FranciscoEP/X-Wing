import { CANVAS, TORPEDO } from '../../config.js';
import { Entity } from './Entity.js';

const RIGHT_MARGIN = 10;

/** Torpedo protón: vuela recto y detona al chocar o al agotar su tiempo de vuelo. */
export class Torpedo extends Entity {
  constructor(x, y) {
    super(x - TORPEDO.SIZE / 2, y - TORPEDO.SIZE / 2, TORPEDO.SIZE, TORPEDO.SIZE);
    this.vx = TORPEDO.SPEED;
    this.age = 0;
  }

  /** Debe detonar por tiempo o por llegar al borde derecho. */
  get expired() {
    return this.age >= TORPEDO.MAX_FLIGHT || this.x + this.width >= CANVAS.WIDTH - RIGHT_MARGIN;
  }

  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
  }
}
