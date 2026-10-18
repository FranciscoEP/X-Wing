import { POWERUP_ITEM, POWERUPS } from '../../config.js';
import { Entity } from './Entity.js';

const BOB = { FREQ: 3, AMPLITUDE: 6 };

/** Cápsula que deja caer un enemigo; se aplica con sim/powerups.js al recogerla. */
export class PowerUp extends Entity {
  constructor(type, x, y) {
    const half = POWERUP_ITEM.SIZE / 2;
    super(x - half, y - half, POWERUP_ITEM.SIZE, POWERUP_ITEM.SIZE);
    if (!POWERUPS[type]) throw new Error(`Power-up desconocido: ${type}`);
    this.type = type;
    this.cfg = POWERUPS[type];
    this.age = 0;
    this.baseY = this.y;
  }

  get timeLeft() {
    return POWERUP_ITEM.LIFETIME - this.age;
  }

  update(dt) {
    this.age += dt;
    this.x -= POWERUP_ITEM.DRIFT_SPEED * dt;
    this.y = this.baseY + Math.sin(this.age * BOB.FREQ) * BOB.AMPLITUDE;
    if (this.timeLeft <= 0 || this.isOffScreen()) this.dead = true;
  }
}
