import { MINE } from '../../config.js';
import { Entity } from './Entity.js';

/**
 * Mina del TIE Bomber. Flota hacia la izquierda y estalla al acabar su tiempo; si el jugador se
 * acerca, se arma y estalla tras una mecha corta. Un láser la destruye sin que explote.
 * `x`, `y` del constructor son su centro.
 */
export class Mine extends Entity {
  constructor(x, y) {
    super(x - MINE.size / 2, y - MINE.size / 2, MINE.size, MINE.size);
    this.hp = MINE.hp;
    this.age = 0;
    this.fuse = null; // segundos hasta estallar, cuando el jugador la activa
  }

  /** Segundos hasta que estalle (para el parpadeo del aviso). */
  get timeLeft() {
    return this.fuse ?? MINE.lifetime - this.age;
  }

  update(dt, world) {
    this.age += dt;
    this.x -= MINE.drift * dt;
    if (this.fuse !== null) {
      this.fuse -= dt;
    } else if (!world.player.dead && Math.hypot(world.player.cx - this.cx, world.player.cy - this.cy) < MINE.proximity) {
      this.fuse = MINE.fuse;
      world.emit('mineArmed', { mine: this });
    }
    if (this.timeLeft <= 0) world.detonateMine(this);
    else if (this.isOffScreen()) this.dead = true;
  }

  /** Devuelve true si el daño la destruyó (sin explotar). */
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    if (this.hp > 0) return false;
    this.dead = true;
    return true;
  }
}
