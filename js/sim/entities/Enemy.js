import { BULLET, CANVAS, ENEMY_TYPES, RETURN } from '../../config.js';
import { rand } from '../../core/utils.js';
import { interceptAngle } from '../ai/aim.js';
import { Evasion } from '../ai/evasion.js';
import { cruise, slash, SPAWN_X } from '../ai/movement.js';
import { createWeapon } from '../ai/weapons.js';
import { Bullet } from './Bullet.js';
import { Entity } from './Entity.js';

const SPAWN = { MIN_Y: 40, BOTTOM_MARGIN: 100 };
const FIRE = { MIN_DISTANCE_TO_PLAYER: 60, RIGHT_MARGIN: 40 };
const HIT_FLASH = 0.08;
const ESCAPE_MARGIN = 60;

/**
 * Caza imperial. Su vuelo lo decide `movement` (sim/ai/movement.js), al que se suma la esquiva
 * (`evasion`); cómo y cuándo ataca, su arma (`weapon`, sim/ai/weapons.js): cada tipo tiene la
 * suya, con su aviso y su ritmo.
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
    this.weapon = createWeapon(cfg.weapon);
    this.hitFlash = 0;
    this.entered = false;
    this.escaped = false;
    this.squadron = null;
    // Vueltas que le quedan si sale de la pantalla sin ser derribado (según tipo y dificultad)
    this.returnsLeft = cfg.returns ? (difficulty.enemyReturns ?? 0) : 0;
    this.returning = 0; // s hasta reaparecer (0 = en juego)
    this.returnY = 0;
  }

  /** Último tramo de la vuelta: el renderer marca por dónde va a entrar. */
  get returnWarning() {
    return this.returning > 0 && this.returning <= RETURN.warn && this.cfg.weapon !== 'FAN' ? { y: this.returnY + this.height / 2 } : null;
  }

  update(dt, world) {
    this.hitFlash -= dt;
    if (this.returning > 0) {
      this.returning -= dt;
      if (this.returning <= 0) this.reenter(world);
      return;
    }
    this.pathY = this.movement.update(this, dt, world);
    if (this.evasion.update(dt, this, world.playerBullets)) world.emit('enemyDodge', { enemy: this });
    this.evasion.clampTo(this.pathY, this.height);
    this.y = this.pathY + this.evasion.offset;

    if (!this.isOffScreen(0)) this.entered = true;
    this.weapon.update(this, dt, world);

    // Pasar el borde izquierdo siempre cuenta como escape, haya llegado a entrar o no:
    // si no, una nave que nunca aparece bloquearía el fin de la oleada.
    const pastLeft = this.x + this.width < -ESCAPE_MARGIN;
    if (pastLeft || (this.entered && this.isOffScreen(ESCAPE_MARGIN))) {
      if (this.returnsLeft > 0) this.startReturn(world);
      else {
        this.dead = true;
        this.escaped = true;
      }
    }
  }

  /** Salió sin ser derribado: da la vuelta fuera de la pantalla y volverá a atacar. */
  startReturn(world) {
    this.returnsLeft--;
    this.returning = RETURN.delay;
    this.returnY = rand(RETURN.minY, RETURN.maxY);
    this.x = CANVAS.WIDTH + 40;
    this.y = this.pathY = this.returnY;
    this.entered = false;
    this.evasion.offset = 0;
    this.evasion.velocity = 0;
    world.emit('enemyReturn', { enemy: this });
  }

  /** Reaparece por la derecha con un ataque nuevo (el Interceptor, con otra pasada en diagonal). */
  reenter(world) {
    this.returning = 0;
    this.x = SPAWN_X;
    this.y = this.pathY = this.returnY;
    this.movement =
      this.cfg.weapon === 'FAN'
        ? slash({ startX: CANVAS.WIDTH * rand(0.55, 0.9), fromTop: rand(0, 1) < 0.5 })
        : cruise({ baseY: this.returnY, wobble: this.cfg.wobble });
    this.weapon = createWeapon(this.cfg.weapon);
    world.emit('enemyReentry', { enemy: this });
  }

  /** En pantalla, por delante del jugador y con el jugador vivo. */
  canFire(world) {
    const onScreen = this.x < CANVAS.WIDTH - FIRE.RIGHT_MARGIN && this.y > 0 && this.y + this.height < CANVAS.HEIGHT;
    const inFront = this.x > world.player.x + FIRE.MIN_DISTANCE_TO_PLAYER;
    return onScreen && inFront && !world.player.dead;
  }

  fireAt(world, { lead } = {}) {
    world.spawnEnemyBullet(this.aimAt(world.player, lead));
  }

  /**
   * Bala hacia donde estará el jugador (según `lead`, por defecto aimLead), con la imprecisión,
   * velocidad y daño de la dificultad.
   */
  aimAt(target, lead = this.difficulty.aimLead) {
    const { aimError, bulletSpeed, damage } = this.difficulty;
    const speed = BULLET.ENEMY_SPEED * bulletSpeed;
    const from = { x: this.x, y: this.cy };
    const angle = interceptAngle(from, target, speed, lead) + rand(-aimError, aimError);
    return new Bullet(from.x, from.y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
      damage: BULLET.ENEMY_DAMAGE * damage,
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
