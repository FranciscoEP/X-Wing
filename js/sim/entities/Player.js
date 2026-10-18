import { BULLET, CANVAS, PLAYER } from '../../config.js';
import { clamp, shrink } from '../../core/utils.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';
import { Torpedo } from './Torpedo.js';

export class Player extends Entity {
  constructor(lives) {
    super(0, 0, PLAYER.WIDTH, PLAYER.HEIGHT);
    this.lives = lives;
    this.torpedoCount = PLAYER.START_TORPEDOES;
    this.powerUps = {}; // tipo -> segundos restantes
    this.reset();
  }

  /** Coloca la nave en la posición inicial con la vida completa e invulnerabilidad temporal. */
  reset() {
    this.x = PLAYER.START_X;
    this.y = CANVAS.HEIGHT / 2 - this.height / 2;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER.MAX_HP;
    this.fireTimer = 0;
    this.invulnerable = PLAYER.RESPAWN_INVULNERABILITY;
    this.dead = false;
  }

  get shielded() {
    return this.hasPowerUp('SHIELD');
  }

  get canBeHit() {
    return !this.dead && this.invulnerable <= 0 && !this.shielded;
  }

  get hpRatio() {
    return this.hp / PLAYER.MAX_HP;
  }

  /** Inclinación visual (-1..1) según la velocidad vertical. */
  get tilt() {
    return this.vy / PLAYER.MAX_SPEED;
  }

  /** Zona vulnerable de la nave, reducida `inset` px por lado (ver HITBOX en config.js). */
  hitbox(inset) {
    return shrink(this, inset);
  }

  hasPowerUp(type) {
    return (this.powerUps[type] ?? 0) > 0;
  }

  /** `controls.moveX/moveY` en -1..1. */
  update(dt, { moveX = 0, moveY = 0 } = {}) {
    if (this.dead) return;

    // Normalizar diagonales para que no sean más rápidas; un joystick analógico ya llega
    // dentro del círculo unidad y no se toca.
    const len = Math.hypot(moveX, moveY);
    const norm = len > 1 ? 1 / len : 1;
    this.vx += moveX * norm * PLAYER.ACCEL * dt;
    this.vy += moveY * norm * PLAYER.ACCEL * dt;
    const damping = Math.exp(-PLAYER.FRICTION * dt);
    this.vx = clamp(this.vx * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);
    this.vy = clamp(this.vy * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);

    const maxX = CANVAS.WIDTH * PLAYER.MAX_X_RATIO - this.width;
    const maxY = CANVAS.HEIGHT - this.height - PLAYER.MARGIN;
    this.x = clamp(this.x + this.vx * dt, PLAYER.MARGIN, maxX);
    this.y = clamp(this.y + this.vy * dt, PLAYER.MARGIN, maxY);

    this.fireTimer -= dt;
    this.invulnerable -= dt;
    for (const type of Object.keys(this.powerUps)) {
      this.powerUps[type] -= dt;
      if (this.powerUps[type] <= 0) delete this.powerUps[type];
    }
  }

  /** Devuelve las balas disparadas (lista vacía si está en cooldown o destruida). */
  tryShoot() {
    if (this.dead || this.fireTimer > 0) return [];
    const factor = this.hasPowerUp('RAPID_FIRE') ? PLAYER.RAPID_FIRE_FACTOR : 1;
    this.fireTimer = PLAYER.FIRE_COOLDOWN * factor;

    const opts = { damage: BULLET.PLAYER_DAMAGE, friendly: true };
    const speed = BULLET.PLAYER_SPEED;
    const nose = this.x + this.width;
    const shots = [
      new Bullet(nose - 20, this.cy - PLAYER.CANNON_OFFSET, speed, 0, opts),
      new Bullet(nose - 20, this.cy + PLAYER.CANNON_OFFSET, speed, 0, opts),
    ];
    if (this.hasPowerUp('TRIPLE_SHOT')) {
      const side = Math.sqrt(1 - BULLET.TRIPLE_SPREAD ** 2);
      shots.push(new Bullet(nose, this.cy, speed, 0, opts));
      shots.push(new Bullet(nose, this.cy, speed * side, -speed * BULLET.TRIPLE_SPREAD, opts));
      shots.push(new Bullet(nose, this.cy, speed * side, speed * BULLET.TRIPLE_SPREAD, opts));
    }
    return shots;
  }

  /** Aplica daño; devuelve true si la nave fue destruida. */
  takeDamage(amount) {
    if (!this.canBeHit) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.lives--;
      return true;
    }
    this.invulnerable = PLAYER.HIT_INVULNERABILITY;
    return false;
  }

  heal(amount) {
    this.hp = Math.min(PLAYER.MAX_HP, this.hp + amount);
  }

  addTorpedoes(amount) {
    this.torpedoCount = Math.min(PLAYER.MAX_TORPEDOES, this.torpedoCount + amount);
  }

  /** Lanza un torpedo desde el morro; null si no quedan o la nave está destruida. */
  launchTorpedo() {
    if (this.dead || this.torpedoCount <= 0) return null;
    this.torpedoCount--;
    return new Torpedo(this.x + this.width, this.cy);
  }

  grantPowerUp(type, duration) {
    this.powerUps[type] = duration;
  }
}
