import { BULLET, CANVAS, ENEMY_TYPES } from '../config.js';
import { rand } from '../core/utils.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';

export class Enemy extends Entity {
  constructor(type, sprite, difficulty, y = rand(40, CANVAS.HEIGHT - 100)) {
    const cfg = ENEMY_TYPES[type];
    super(CANVAS.WIDTH + 10, y, cfg.size, cfg.size * 0.8);
    this.type = type;
    this.cfg = cfg;
    this.sprite = sprite;
    this.hp = cfg.hp;
    this.score = cfg.score;
    this.speed = cfg.speed * difficulty.enemySpeed;
    this.fireRate = cfg.fireRate * difficulty.enemyFire;
    this.baseY = y;
    this.age = rand(0, Math.PI * 2);
    this.fireTimer = rand(0.6, 1.6);
    this.hitFlash = 0;
    this.escaped = false;
  }

  update(dt, world) {
    this.age += dt;
    this.x -= this.speed * dt;
    this.y = this.baseY + Math.sin(this.age * 2) * this.cfg.wobble;
    this.hitFlash -= dt;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.x < CANVAS.WIDTH - 40 && this.x > world.player.x + 60) {
      this.fireTimer = 1 / this.fireRate + rand(-0.3, 0.3);
      this.fireAt(world);
    }

    if (this.x + this.width < -20) {
      this.dead = true;
      this.escaped = true;
    }
  }

  fireAt(world) {
    const { player } = world;
    // Apunta al jugador con cierta imprecisión
    const aim = Math.atan2(player.cy - this.cy, player.cx - this.x) + rand(-0.12, 0.12);
    world.spawnBullet(
      new Bullet(this.x, this.cy, Math.cos(aim) * BULLET.ENEMY_SPEED, Math.sin(aim) * BULLET.ENEMY_SPEED, {
        damage: BULLET.ENEMY_DAMAGE,
        friendly: false,
      })
    );
  }

  /** Devuelve true si el daño lo destruyó. */
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    if (this.hitFlash > 0) ctx.filter = 'brightness(2.5)';
    if (this.type === 'TIE_INTERCEPTOR') {
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 10;
    }
    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.restore();
  }
}
