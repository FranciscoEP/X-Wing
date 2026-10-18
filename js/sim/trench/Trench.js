import { BULLET, CANVAS, PORT, TRENCH, TRENCH_VADER } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';
import { scroll } from '../ai/movement.js';
import { Bullet } from '../entities/Bullet.js';
import { Entity } from '../entities/Entity.js';

/**
 * Carrera por la trinchera de la Estrella de la Muerte (fase final).
 *  0 s        entrada tranquila: escudo reparado y torpedos extra (el «respiro»)
 *  calm       empiezan las torretas en las paredes
 *  vaderAt    Vader se pone detrás y dispara hacia delante
 *  portAt     aparece el puerto de escape: solo un torpedo lo destruye
 *  duration   la Estrella de la Muerte dispara su superláser: derrota
 */
export class Trench {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.t = 0;
    this.turretTimer = 0;
    this.nextOnTop = rand(0, 1) < 0.5;
    this.vader = null;
    this.port = null;
    this.won = false;
    this.offset = 0; // desplazamiento acumulado de las paredes (para el dibujo)
  }

  get top() {
    return TRENCH.top;
  }

  get bottom() {
    return TRENCH.bottom;
  }

  get timeLeft() {
    return Math.max(0, TRENCH.duration - this.t);
  }

  /** Mantiene al jugador dentro del pasillo y por delante de Vader. */
  confine(player) {
    player.x = Math.max(player.x, TRENCH.minPlayerX);
    player.y = clamp(player.y, this.top, this.bottom - player.height);
  }

  update(dt, world) {
    if (this.won) return;
    this.t += dt;
    this.offset += TRENCH.speed * dt;

    if (this.t >= TRENCH.calm) this.updateTurrets(dt, world);
    if (this.t >= TRENCH.vaderAt && !this.vader) {
      this.vader = new TrenchVader(world.player.cy);
      world.emit('trenchVader');
    }
    this.vader?.update(dt, world);
    if (this.t >= TRENCH.portAt && !this.port) {
      this.port = new ExhaustPort((this.top + this.bottom) / 2);
      world.emit('portInRange', { port: this.port });
    }
    this.port?.update(dt);
    if (this.t >= TRENCH.duration) world.superlaserFired();
  }

  updateTurrets(dt, world) {
    this.turretTimer -= dt;
    if (this.turretTimer > 0) return;
    this.turretTimer = (TRENCH.turretEvery * rand(1 - TRENCH.turretJitter, 1 + TRENCH.turretJitter)) / this.difficulty.enemyFire;
    const onTop = this.nextOnTop;
    this.nextOnTop = rand(0, 1) < 0.35 ? onTop : !onTop; // suele alternar pared
    const height = 32;
    const y = onTop ? this.top - 6 : this.bottom - height + 6;
    const turret = world.spawnEnemy('TRENCH_TURRET', { y, movement: scroll({ y, speed: TRENCH.speed }) });
    turret.onTop = onTop;
  }
}

/** Vader detrás del jugador: sigue su altura con retraso y dispara pares hacia delante. */
export class TrenchVader {
  constructor(y) {
    this.x = TRENCH_VADER.x;
    this.cy = y;
    this.width = 80;
    this.height = 68;
    this.timer = TRENCH_VADER.every;
    this.chargeLeft = 0;
  }

  get charge() {
    return this.chargeLeft > 0 ? 1 - this.chargeLeft / TRENCH_VADER.charge : 0;
  }

  get cx() {
    return this.x + this.width / 2;
  }

  update(dt, world) {
    this.cy += (world.player.cy - this.cy) * (1 - Math.exp(-TRENCH_VADER.follow * dt));
    if (this.chargeLeft > 0) {
      this.chargeLeft -= dt;
      if (this.chargeLeft <= 0) this.fire(world);
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0 && !world.player.dead) {
      this.timer = TRENCH_VADER.every;
      this.chargeLeft = TRENCH_VADER.charge;
    }
  }

  fire(world) {
    const speed = BULLET.ENEMY_SPEED * TRENCH_VADER.speedFactor;
    for (const dy of [-TRENCH_VADER.gap, TRENCH_VADER.gap]) {
      world.spawnEnemyBullet(new Bullet(this.x + this.width, this.cy + dy, speed, 0, { damage: BULLET.ENEMY_DAMAGE, friendly: false }));
    }
  }
}

/** Puerto de escape: llega al final del pasillo y se detiene. Solo un torpedo lo destruye. */
export class ExhaustPort extends Entity {
  constructor(cy) {
    super(CANVAS.WIDTH + 10, cy - PORT.height / 2, PORT.width, PORT.height);
    this.stopX = CANVAS.WIDTH * PORT.stopXRatio;
    this.destroyed = false;
  }

  update(dt) {
    if (this.x > this.stopX) this.x = Math.max(this.stopX, this.x - PORT.speed * dt);
  }
}
