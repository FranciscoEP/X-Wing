import { BULLET, CANVAS } from '../../config.js';
import { overlaps, rand } from '../../core/utils.js';
import { Bullet } from '../Bullet.js';
import { Entity } from '../Entity.js';

/**
 * Base de los jefes: entrada desde la derecha, daño, secuencia de muerte y utilidades de disparo.
 * Las subclases implementan `behave(dt, world)` y `drawBody(ctx, time)`.
 */
export class Boss extends Entity {
  constructor({ name, hp, score, width, height, targetX, y }, difficulty) {
    super(CANVAS.WIDTH + 40, y, width, height);
    this.name = name;
    this.maxHp = Math.round(hp * difficulty.bossHp);
    this.hp = this.maxHp;
    this.score = score;
    this.targetX = targetX;
    this.difficulty = difficulty;
    this.entering = true;
    this.dying = false;
    this.deathTimer = 0;
    this.hitFlash = 0;
    this.age = 0;
    this.baseFilter = '';
  }

  get enraged() {
    return this.hp < this.maxHp / 2;
  }

  get vulnerable() {
    return !this.entering && !this.dying;
  }

  update(dt, world) {
    this.age += dt;
    this.hitFlash -= dt;

    if (this.dying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.5) {
        world.particles.explosion(rand(this.x, this.x + this.width), rand(this.y, this.y + this.height), {
          count: 14,
        });
      }
      if (this.deathTimer <= 0) {
        world.particles.explosion(this.cx, this.cy, { count: 120, speed: 420, size: 5 });
        world.effects.flash('#fff', 0.6);
        this.dead = true;
      }
      return;
    }

    if (this.entering) {
      this.x -= 160 * dt;
      if (this.x <= this.targetX) {
        this.x = this.targetX;
        this.entering = false;
      }
      return;
    }

    this.behave(dt, world);
  }

  behave() {}

  /** 'hit' si el proyectil daña, 'armor' si rebota, null si no toca. */
  hitTest(bullet) {
    return overlaps(bullet, this) ? 'hit' : null;
  }

  /** Devuelve true si el daño inició la secuencia de destrucción. */
  takeDamage(amount) {
    if (!this.vulnerable) return false;
    this.hp -= amount;
    this.hitFlash = 0.06;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.deathTimer = 2.2;
      return true;
    }
    return false;
  }

  fireSpread(world, x, y, angle, { count = 1, spread = 0, speed = BULLET.ENEMY_SPEED, color, size = 3 } = {}) {
    const s = speed * Math.min(1.25, this.difficulty.enemyFire);
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? angle : angle - spread / 2 + (spread * i) / (count - 1);
      world.spawnBullet(
        new Bullet(x, y, Math.cos(a) * s, Math.sin(a) * s, {
          damage: BULLET.ENEMY_DAMAGE,
          friendly: false,
          color,
          thickness: size,
          length: 14 + size * 4,
        })
      );
    }
  }

  angleTo(target, x = this.x, y = this.cy) {
    return Math.atan2(target.cy - y, target.cx - x);
  }

  draw(ctx, time) {
    ctx.save();
    const filter = `${this.baseFilter} ${this.hitFlash > 0 ? 'brightness(1.8)' : ''}`.trim();
    if (filter) ctx.filter = filter;
    if (this.dying) ctx.translate(rand(-3, 3), rand(-3, 3));
    this.drawBody(ctx, time);
    ctx.restore();
  }

  drawBody() {}
}
