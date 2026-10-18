import { BULLET, CANVAS, ENEMY_TYPES } from '../../config.js';
import { rand } from '../../core/utils.js';
import { interceptAngle } from '../ai/aim.js';
import { Evasion } from '../ai/evasion.js';
import { cruise, SPAWN_X } from '../ai/movement.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';

const SPAWN = { MIN_Y: 40, BOTTOM_MARGIN: 100 };
const FIRE = { FIRST_MIN: 0.6, FIRST_MAX: 1.6, JITTER: 0.3, MIN_DISTANCE_TO_PLAYER: 60, RIGHT_MARGIN: 40 };
const HIT_FLASH = 0.08;
const ESCAPE_MARGIN = 60;

/**
 * Caza imperial. Su vuelo lo decide `movement` (sim/ai/movement.js), al que se suma la esquiva
 * (`evasion`); al disparar anticipa el movimiento del jugador según la dificultad.
 */
export class Enemy extends Entity {
  constructor(type, difficulty, { x = SPAWN_X, y = rand(SPAWN.MIN_Y, CANVAS.HEIGHT - SPAWN.BOTTOM_MARGIN), movement = null, fromWave = false } = {}) {
    const cfg = ENEMY_TYPES[type];
    if (!cfg) throw new Error(`Enemigo desconocido: ${type}`);
    super(x, y, cfg.size, cfg.size * 0.8);
    this.type = type;
    this.cfg = cfg;
    this.difficulty = difficulty;
    this.fromWave = fromWave;
    this.hp = cfg.hp;
    this.score = cfg.score;
    this.speed = cfg.speed * difficulty.enemySpeed;
    this.fireRate = cfg.fireRate * difficulty.enemyFire;
    this.movement = movement ?? cruise({ baseY: y, wobble: cfg.wobble });
    this.evasion = new Evasion(cfg.dodge, difficulty.dodge);
    this.pathY = y;
    this.fireTimer = rand(FIRE.FIRST_MIN, FIRE.FIRST_MAX);
    this.hitFlash = 0;
    this.entered = false;
    this.escaped = false;
  }

  update(dt, world) {
    this.hitFlash -= dt;
    this.pathY = this.movement.update(this, dt, world);
    if (this.evasion.update(dt, this, world.playerBullets)) world.emit('enemyDodge', { enemy: this });
    this.evasion.clampTo(this.pathY, this.height);
    this.y = this.pathY + this.evasion.offset;

    if (!this.isOffScreen(0)) this.entered = true;
    this.tryFire(dt, world);

    // Pasar el borde izquierdo siempre cuenta como escape, haya llegado a entrar o no:
    // si no, una nave que nunca aparece bloquearía el fin de la oleada.
    const pastLeft = this.x + this.width < -ESCAPE_MARGIN;
    if (pastLeft || (this.entered && this.isOffScreen(ESCAPE_MARGIN))) {
      this.dead = true;
      this.escaped = true;
    }
  }

  tryFire(dt, world) {
    this.fireTimer -= dt;
    const onScreen = this.x < CANVAS.WIDTH - FIRE.RIGHT_MARGIN && this.y > 0 && this.y + this.height < CANVAS.HEIGHT;
    const inFront = this.x > world.player.x + FIRE.MIN_DISTANCE_TO_PLAYER;
    if (this.fireTimer > 0 || !onScreen || !inFront || world.player.dead) return;
    this.fireTimer = 1 / this.fireRate + rand(-FIRE.JITTER, FIRE.JITTER);
    world.spawnEnemyBullet(this.aimAt(world.player));
  }

  /** Bala hacia donde estará el jugador (según aimLead), con cierta imprecisión. */
  aimAt(target) {
    const from = { x: this.x, y: this.cy };
    const angle = interceptAngle(from, target, BULLET.ENEMY_SPEED, this.difficulty.aimLead) + rand(-BULLET.ENEMY_AIM_ERROR, BULLET.ENEMY_AIM_ERROR);
    return new Bullet(from.x, from.y, Math.cos(angle) * BULLET.ENEMY_SPEED, Math.sin(angle) * BULLET.ENEMY_SPEED, {
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
