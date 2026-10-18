import { BOSS_TYPES, CANVAS, HITBOX } from '../../config.js';
import { centerOf, overlaps } from '../../core/utils.js';
import { Boss, HIT } from './Boss.js';

export const RADIUS = BOSS_TYPES.DEATH_STAR.width / 2;
export const LASER = { CHARGE: 1.8, FIRE: 1.1, COOLDOWN: 5.5, ENRAGED_COOLDOWN_FACTOR: 0.7, FIRST_DELAY: 4, HEIGHT: 46, DPS: 45 };
export const LASER_STATE = { IDLE: 'idle', CHARGING: 'charging', FIRING: 'firing' };

// AIM_TOLERANCE: px extra por encima/debajo del puerto que aún cuentan como impacto.
const PORT = { ORBIT: 0.8, SIZE: 28, SWING: 1.15, SPEED: 0.6, SPEED_ENRAGED: 0.9, AIM_TOLERANCE: 12 };
const DISH = { DX: -0.45, DY: -0.35 };
const AI = { BOB_AMPLITUDE: 30, BOB_FREQ: 0.3, RING_EVERY: 2.4, RING_EVERY_ENRAGED: 1.6, RING_SPREAD: 1.4, RING_SPEED: 240 };

/**
 * Estrella de la Muerte: solo el puerto de escape (punto débil) recibe daño.
 * Cada cierto tiempo fija la altura del jugador y dispara el superláser.
 */
export class DeathStar extends Boss {
  constructor(difficulty) {
    super('DEATH_STAR', { targetX: CANVAS.WIDTH - RADIUS - 40, y: CANVAS.HEIGHT / 2 - RADIUS }, difficulty);
    this.ringTimer = 2;
    this.laserState = LASER_STATE.IDLE;
    this.laserTimer = LASER.FIRST_DELAY;
    this.laserY = 0;
    this.portAngle = Math.PI;
  }

  /** Puerto de escape: orbita en la cara visible. */
  get port() {
    const r = RADIUS * PORT.ORBIT;
    return {
      x: this.cx + Math.cos(this.portAngle) * r - PORT.SIZE / 2,
      y: this.cy + Math.sin(this.portAngle) * r - PORT.SIZE / 2,
      width: PORT.SIZE,
      height: PORT.SIZE,
    };
  }

  /** Centro del plato del superláser. */
  get dish() {
    return { x: this.cx + RADIUS * DISH.DX, y: this.cy + RADIUS * DISH.DY };
  }

  get beam() {
    return { x: 0, y: this.laserY - LASER.HEIGHT / 2, width: this.dish.x, height: LASER.HEIGHT };
  }

  behave(dt, world) {
    const speed = this.enraged ? PORT.SPEED_ENRAGED : PORT.SPEED;
    this.portAngle = Math.PI + Math.sin(this.age * speed) * PORT.SWING;
    this.y = CANVAS.HEIGHT / 2 - RADIUS + Math.sin(this.age * AI.BOB_FREQ) * AI.BOB_AMPLITUDE;

    this.ringTimer -= dt;
    if (this.ringTimer <= 0) {
      this.ringTimer = this.enraged ? AI.RING_EVERY_ENRAGED : AI.RING_EVERY;
      const { x, y } = this.dish;
      this.fireSpread(world, x, y, Math.PI, { count: this.enraged ? 9 : 7, spread: AI.RING_SPREAD, speed: AI.RING_SPEED, size: 4 });
    }

    this.updateSuperlaser(dt, world);
  }

  updateSuperlaser(dt, world) {
    this.laserTimer -= dt;
    switch (this.laserState) {
      case LASER_STATE.IDLE:
        if (this.laserTimer <= 0) {
          this.laserState = LASER_STATE.CHARGING;
          this.laserTimer = LASER.CHARGE;
          this.laserY = world.player.cy;
        }
        break;
      case LASER_STATE.CHARGING:
        if (this.laserTimer <= 0) {
          this.laserState = LASER_STATE.FIRING;
          this.laserTimer = LASER.FIRE;
          world.emit('superlaser', { boss: this });
        }
        break;
      case LASER_STATE.FIRING:
        if (overlaps(this.beam, world.player.hitbox(HITBOX.PLAYER_VS_LASER))) world.damagePlayer(LASER.DPS * dt, { silent: true });
        if (this.laserTimer <= 0) {
          this.laserState = LASER_STATE.IDLE;
          this.laserTimer = LASER.COOLDOWN * (this.enraged ? LASER.ENRAGED_COOLDOWN_FACTOR : 1);
        }
        break;
    }
  }

  /**
   * El puerto está pintado dentro de la esfera, así que un disparo horizontal toca antes el
   * blindaje del borde. Por eso todo lo que entra en la esfera a la altura del puerto cuenta
   * como impacto en el punto débil (la bala "va de camino" hacia él).
   */
  hitTest(rect) {
    if (overlaps(rect, this.port)) return HIT.DAMAGE;
    const { x, y } = centerOf(rect);
    const dx = x - this.cx;
    const dy = y - this.cy;
    if (dx * dx + dy * dy >= RADIUS * RADIUS) return null;
    const port = centerOf(this.port);
    const inLine = Math.abs(y - port.y) <= PORT.SIZE / 2 + rect.height / 2 + PORT.AIM_TOLERANCE;
    return inLine && x <= port.x ? HIT.DAMAGE : HIT.ARMOR;
  }
}
