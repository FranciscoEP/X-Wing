import { BOSS, BOSS_TYPES, BULLET, CANVAS } from '../../config.js';
import { overlaps, rand } from '../../core/utils.js';
import { interceptAngle } from '../ai/aim.js';
import { Bullet } from '../entities/Bullet.js';
import { Entity } from '../entities/Entity.js';

export const HIT = { DAMAGE: 'hit', ARMOR: 'armor' };

const HIT_FLASH = 0.06;
const DEATH_EXPLOSION_CHANCE = 0.5;

/**
 * Base de los jefes: entrada desde la derecha, daño, secuencia de destrucción y utilidades de disparo.
 * Las subclases implementan `behave(dt, world)` y, si la forma no es rectangular, `hitTest(rect)`.
 *
 * `world` debe ofrecer: player, spawnEnemyBullet(bullet), spawnEnemy(type, opts),
 * damagePlayer(amount, opts) y emit(event, payload).
 */
export class Boss extends Entity {
  constructor(type, { targetX, y }, difficulty) {
    const cfg = BOSS_TYPES[type];
    super(CANVAS.WIDTH + 40, y, cfg.width, cfg.height);
    this.type = type;
    this.name = cfg.name;
    this.score = cfg.score;
    this.maxHp = Math.round(cfg.hp * difficulty.bossHp);
    this.hp = this.maxHp;
    this.targetX = targetX;
    this.difficulty = difficulty;
    this.entering = true;
    this.dying = false;
    this.deathTimer = 0;
    this.hitFlash = 0;
    this.age = 0;
  }

  get enraged() {
    return this.hp < this.maxHp / 2;
  }

  get vulnerable() {
    return !this.entering && !this.dying && !this.dead;
  }

  update(dt, world) {
    this.age += dt;
    this.hitFlash -= dt;

    if (this.dying) return this.updateDeath(dt, world);
    if (this.entering) return this.updateEntry(dt);
    // bossPace acelera todo el comportamiento (movimiento y ataques) según la dificultad
    this.behave(dt * this.difficulty.bossPace, world);
  }

  updateEntry(dt) {
    this.x -= BOSS.ENTRY_SPEED * dt;
    if (this.x <= this.targetX) {
      this.x = this.targetX;
      this.entering = false;
    }
  }

  updateDeath(dt, world) {
    this.deathTimer -= dt;
    if (rand(0, 1) < DEATH_EXPLOSION_CHANCE) {
      world.emit('explosion', { x: rand(this.x, this.x + this.width), y: rand(this.y, this.y + this.height), size: 'small' });
    }
    if (this.deathTimer <= 0) {
      this.dead = true;
      world.emit('bossDestroyed', { boss: this });
    }
  }

  behave() {}

  /** Punto al que conviene apuntar (pilotos automáticos y pruebas). */
  get targetPoint() {
    return { x: this.cx, y: this.cy };
  }

  /** HIT.DAMAGE si `rect` daña al jefe, HIT.ARMOR si rebota, null si no toca. */
  hitTest(rect) {
    return overlaps(rect, this) ? HIT.DAMAGE : null;
  }

  /** Contacto físico con el casco (para chocar con el jugador), con o sin blindaje. */
  collides(rect) {
    return this.hitTest(rect) !== null;
  }

  /** Devuelve true si el daño inició la secuencia de destrucción. */
  takeDamage(amount) {
    if (!this.vulnerable) return false;
    this.hp -= amount;
    this.hitFlash = HIT_FLASH;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.deathTimer = BOSS.DEATH_DURATION;
      return true;
    }
    return false;
  }

  /** Rapidez real de sus balas según la dificultad. */
  bulletSpeed(speed = BULLET.ENEMY_SPEED) {
    return speed * this.difficulty.bulletSpeed;
  }

  /** Dispara `count` balas repartidas en un abanico de `spread` radianes centrado en `angle`. */
  fireSpread(world, x, y, angle, { count = 1, spread = 0, speed = BULLET.ENEMY_SPEED, color = null, size = 3 } = {}) {
    const s = this.bulletSpeed(speed);
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? angle : angle - spread / 2 + (spread * i) / (count - 1);
      world.spawnEnemyBullet(
        new Bullet(x, y, Math.cos(a) * s, Math.sin(a) * s, {
          damage: BULLET.ENEMY_DAMAGE * this.difficulty.damage,
          friendly: false,
          color,
          thickness: size,
          length: 14 + size * 4,
        })
      );
    }
  }

  /** Como fireSpread, pero apuntando a donde estará el jugador (puntería predictiva). */
  fireAt(world, x, y, opts = {}) {
    const angle = interceptAngle({ x, y }, world.player, this.bulletSpeed(opts.speed), this.difficulty.aimLead);
    this.fireSpread(world, x, y, angle, opts);
  }
}
