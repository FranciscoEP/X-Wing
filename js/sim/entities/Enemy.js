import { BULLET, CANVAS, ENEMY_TYPES } from '../../config.js';
import { rand } from '../../core/utils.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';

const SPAWN = { MIN_Y: 40, BOTTOM_MARGIN: 100, X_OFFSET: 10 };
const FIRE = { FIRST_MIN: 0.6, FIRST_MAX: 1.6, JITTER: 0.3, MIN_DISTANCE_TO_PLAYER: 60, RIGHT_MARGIN: 40 };
const HIT_FLASH = 0.08;
const WOBBLE_FREQ = 2;
const ESCAPE_MARGIN = 20;

export class Enemy extends Entity {
  constructor(type, difficulty, { y = rand(SPAWN.MIN_Y, CANVAS.HEIGHT - SPAWN.BOTTOM_MARGIN), fromWave = false } = {}) {
    const cfg = ENEMY_TYPES[type];
    if (!cfg) throw new Error(`Enemigo desconocido: ${type}`);
    super(CANVAS.WIDTH + SPAWN.X_OFFSET, y, cfg.size, cfg.size * 0.8);
    this.type = type;
    this.cfg = cfg;
    this.fromWave = fromWave;
    this.hp = cfg.hp;
    this.score = cfg.score;
    this.speed = cfg.speed * difficulty.enemySpeed;
    this.fireRate = cfg.fireRate * difficulty.enemyFire;
    this.baseY = y;
    this.age = rand(0, Math.PI * 2);
    this.fireTimer = rand(FIRE.FIRST_MIN, FIRE.FIRST_MAX);
    this.hitFlash = 0;
    this.escaped = false;
  }

  update(dt, world) {
    this.age += dt;
    this.x -= this.speed * dt;
    this.y = this.baseY + Math.sin(this.age * WOBBLE_FREQ) * this.cfg.wobble;
    this.hitFlash -= dt;

    this.fireTimer -= dt;
    const inRange = this.x < CANVAS.WIDTH - FIRE.RIGHT_MARGIN && this.x > world.player.x + FIRE.MIN_DISTANCE_TO_PLAYER;
    if (this.fireTimer <= 0 && inRange) {
      this.fireTimer = 1 / this.fireRate + rand(-FIRE.JITTER, FIRE.JITTER);
      world.spawnEnemyBullet(this.aimAt(world.player));
    }

    if (this.x + this.width < -ESCAPE_MARGIN) {
      this.dead = true;
      this.escaped = true;
    }
  }

  /** Bala hacia el jugador con cierta imprecisión. */
  aimAt(target) {
    const aim = Math.atan2(target.cy - this.cy, target.cx - this.x) + rand(-BULLET.ENEMY_AIM_ERROR, BULLET.ENEMY_AIM_ERROR);
    return new Bullet(this.x, this.cy, Math.cos(aim) * BULLET.ENEMY_SPEED, Math.sin(aim) * BULLET.ENEMY_SPEED, {
      damage: BULLET.ENEMY_DAMAGE,
      friendly: false,
    });
  }

  /** Devuelve true si el daño lo destruyó. */
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlash = HIT_FLASH;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }
}
