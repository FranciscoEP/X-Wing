import { BULLET, CANVAS, KEYS, PLAYER } from '../config.js';
import { clamp } from '../core/utils.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(sprite, lives) {
    super(0, 0, PLAYER.WIDTH, PLAYER.HEIGHT);
    this.sprite = sprite;
    this.lives = lives;
    this.bombs = PLAYER.START_BOMBS;
    this.powerUps = {}; // tipo -> segundos restantes
    this.reset();
  }

  /** Coloca la nave en la posición inicial con la vida completa. */
  reset() {
    this.x = 80;
    this.y = CANVAS.HEIGHT / 2 - this.height / 2;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER.MAX_HP;
    this.fireTimer = 0;
    this.invulnerable = PLAYER.RESPAWN_INVULNERABILITY;
    this.dead = false;
    this.tilt = 0;
  }

  get shielded() {
    return (this.powerUps.SHIELD ?? 0) > 0;
  }

  get canBeHit() {
    return !this.dead && this.invulnerable <= 0 && !this.shielded;
  }

  update(dt, input) {
    if (this.dead) return;

    const ax = (input.isDown(KEYS.RIGHT) ? 1 : 0) - (input.isDown(KEYS.LEFT) ? 1 : 0);
    const ay = (input.isDown(KEYS.DOWN) ? 1 : 0) - (input.isDown(KEYS.UP) ? 1 : 0);
    // Normalizar diagonales para que no sean más rápidas.
    const norm = ax && ay ? Math.SQRT1_2 : 1;

    this.vx += ax * norm * PLAYER.ACCEL * dt;
    this.vy += ay * norm * PLAYER.ACCEL * dt;
    const damping = Math.exp(-PLAYER.FRICTION * dt);
    this.vx = clamp(this.vx * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);
    this.vy = clamp(this.vy * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);

    this.x = clamp(this.x + this.vx * dt, 8, CANVAS.WIDTH * 0.75 - this.width);
    this.y = clamp(this.y + this.vy * dt, 8, CANVAS.HEIGHT - this.height - 8);
    this.tilt = this.vy / PLAYER.MAX_SPEED;

    this.fireTimer -= dt;
    this.invulnerable -= dt;
    for (const type of Object.keys(this.powerUps)) {
      this.powerUps[type] -= dt;
      if (this.powerUps[type] <= 0) delete this.powerUps[type];
    }
  }

  /** Devuelve las balas disparadas este frame (o una lista vacía si está en cooldown). */
  tryShoot() {
    if (this.dead || this.fireTimer > 0) return [];
    const rapid = this.powerUps.RAPID_FIRE > 0;
    this.fireTimer = PLAYER.FIRE_COOLDOWN * (rapid ? 0.5 : 1);

    const opts = { damage: BULLET.PLAYER_DAMAGE, friendly: true };
    const nose = this.x + this.width;
    const shots = [
      new Bullet(nose - 20, this.y + 6, BULLET.PLAYER_SPEED, 0, opts),
      new Bullet(nose - 20, this.y + this.height - 6, BULLET.PLAYER_SPEED, 0, opts),
    ];
    if (this.powerUps.TRIPLE_SHOT > 0) {
      shots.push(new Bullet(nose, this.cy, BULLET.PLAYER_SPEED, 0, opts));
      shots.push(new Bullet(nose, this.cy, BULLET.PLAYER_SPEED * 0.96, -BULLET.PLAYER_SPEED * 0.22, opts));
      shots.push(new Bullet(nose, this.cy, BULLET.PLAYER_SPEED * 0.96, BULLET.PLAYER_SPEED * 0.22, opts));
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

  draw(ctx, time) {
    if (this.dead) return;
    if (this.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.tilt * 0.15);

    // Brillo de los motores
    const flicker = 0.7 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(255, 140, 60, ${0.6 * flicker})`;
    ctx.shadowColor = '#ff8c3c';
    ctx.shadowBlur = 14;
    for (const dy of [-12, 12]) {
      ctx.beginPath();
      ctx.ellipse(-this.width / 2 - 2, dy, 8 * flicker, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (this.sprite) {
      ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 0);
      ctx.lineTo(-this.width / 2, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.fill();
    }

    if (this.shielded) {
      const left = this.powerUps.SHIELD;
      ctx.globalAlpha = left < 1.5 ? 0.3 + 0.3 * Math.sin(time * 20) : 0.45;
      ctx.strokeStyle = '#22d3ee';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}
