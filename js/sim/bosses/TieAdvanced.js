import { CANVAS, FORMATION } from '../../config.js';
import { clamp } from '../../core/utils.js';
import { interceptAngle } from '../ai/aim.js';
import { hostile } from '../ai/weapons.js';
import { Evasion } from '../ai/evasion.js';
import { spawnSquadron } from '../ai/formations.js';
import { Boss, HIT } from './Boss.js';

/**
 * Etapas de combate según la vida restante. Cada una añade comportamientos a la anterior:
 * PURSUIT: persigue y dispara pares rápidos · ASSAULT: además embiste ·
 * DESPERATE: además escudo, escoltas y la mira que te fija antes de una ráfaga.
 */
export const VADER_STAGE = {
  PURSUIT: { id: 'PURSUIT', minHp: 0.66, label: 'Vader te persigue' },
  ASSAULT: { id: 'ASSAULT', minHp: 0.33, label: '¡Vader embiste!' },
  DESPERATE: { id: 'DESPERATE', minHp: 0, label: 'Escudo, escoltas y mira' },
};
const STAGE_ORDER = [VADER_STAGE.PURSUIT, VADER_STAGE.ASSAULT, VADER_STAGE.DESPERATE];

/** Modos de vuelo: persecución normal y la secuencia de embestida (aviso → carga → regreso). */
export const VADER_MODE = { PURSUE: 'pursue', WINDUP: 'windup', CHARGE: 'charge', RETURN: 'return' };

const AI = {
  FOLLOW: 2.5,
  FOLLOW_DESPERATE: 4,
  DAMPING: 2.5,
  SWAY_AMPLITUDE: 60,
  SWAY_FREQ: 0.8,
  X_EASE: 3,
  EDGE_MARGIN: 10,
};

/** Pares rápidos: dos láseres paralelos apuntados, tras 0,25 s de aviso en los cañones. */
export const PAIR = { EVERY: 1.0, EVERY_DESPERATE: 0.8, CHARGE: 0.25, GAP: 12, SPEED_FACTOR: 1.3 };

/**
 * Mira (etapa 3): sigue al jugador con retraso `TRACK` s, se fija `LOCKED` s (parpadea) y
 * dispara una ráfaga de `SHOTS` al punto fijado. Si te mueves tras fijarse, fallará.
 */
export const LOCK = { EVERY: 4.5, TRACK: 1.5, LOCKED: 0.35, FOLLOW: 4, SHOTS: 5, SHOT_GAP: 0.08, SPEED_FACTOR: 1.2 };
export const LOCK_STATE = { IDLE: 'idle', TRACKING: 'tracking', LOCKED: 'locked', FIRING: 'firing' };

export const CHARGE = {
  EVERY: 5.5,
  EVERY_DESPERATE: 4,
  WINDUP: 0.9, // tiempo de aviso: la línea roja que permite esquivar
  SPEED: 950,
  RETURN_SPEED: 420,
  END_X: 30,
  Y_EASE: 8,
};

export const SHIELD = { ON: 2.5, OFF: 4.5 };

const DODGE = { chance: 0.5, reaction: 0.3, speed: 420, cooldown: 1.2 };
const ESCORTS = { formation: FORMATION.V, size: 2 };

/** Darth Vader: su comportamiento escala por etapas a medida que pierde vida. */
export class TieAdvanced extends Boss {
  constructor(difficulty) {
    super('TIE_ADVANCED', { targetX: CANVAS.WIDTH - 200, y: CANVAS.HEIGHT / 2 - 46 }, difficulty);
    this.stage = VADER_STAGE.PURSUIT;
    this.mode = VADER_MODE.PURSUE;
    this.fireTimer = 1; // hasta el próximo par
    this.pairCharge = 0; // s restantes del aviso del par (0 = sin aviso)
    this.lock = { state: LOCK_STATE.IDLE, timer: LOCK.EVERY / 2, x: 0, y: 0, shotsLeft: 0 };
    this.vy = 0;
    this.chargeTimer = CHARGE.EVERY;
    this.chargeY = 0;
    this.modeTimer = 0;
    this.shielded = false;
    this.shieldTimer = SHIELD.OFF;
    this.evasion = new Evasion(DODGE, difficulty.dodge);
  }

  /** Etapa que corresponde a la vida actual. */
  stageForHp() {
    const ratio = this.hp / this.maxHp;
    return STAGE_ORDER.find((s) => ratio >= s.minHp) ?? VADER_STAGE.DESPERATE;
  }

  behave(dt, world) {
    this.updateStage(world);
    this.updateShield(dt);

    switch (this.mode) {
      case VADER_MODE.PURSUE:
        this.pursue(dt, world);
        break;
      case VADER_MODE.WINDUP:
        this.windup(dt, world);
        break;
      case VADER_MODE.CHARGE:
        this.x -= CHARGE.SPEED * dt;
        if (this.x <= CHARGE.END_X) this.setMode(VADER_MODE.RETURN, world);
        break;
      case VADER_MODE.RETURN:
        this.x += CHARGE.RETURN_SPEED * dt;
        if (this.x >= this.targetX) this.setMode(VADER_MODE.PURSUE, world);
        break;
    }
  }

  setMode(mode, world) {
    this.mode = mode;
    if (mode === VADER_MODE.WINDUP) this.modeTimer = CHARGE.WINDUP;
    if (mode === VADER_MODE.PURSUE) this.chargeTimer = this.stage === VADER_STAGE.DESPERATE ? CHARGE.EVERY_DESPERATE : CHARGE.EVERY;
    world.emit('vaderMode', { boss: this, mode });
  }

  updateStage(world) {
    const next = this.stageForHp();
    if (next === this.stage) return;
    this.stage = next;
    world.emit('bossStage', { boss: this, stage: next });
    if (next === VADER_STAGE.DESPERATE) {
      spawnSquadron(world, 'TIE_FIGHTER', ESCORTS, { fromWave: false });
      this.shieldTimer = 0; // activa el escudo de inmediato
    }
  }

  updateShield(dt) {
    if (this.stage !== VADER_STAGE.DESPERATE) return;
    // Durante la embestida no hay escudo: es la ventana para castigarlo
    if (this.mode !== VADER_MODE.PURSUE) {
      this.shielded = false;
      return;
    }
    this.shieldTimer -= dt;
    if (this.shieldTimer <= 0) {
      this.shielded = !this.shielded;
      this.shieldTimer = this.shielded ? SHIELD.ON : SHIELD.OFF;
    }
  }

  pursue(dt, world) {
    const { player } = world;
    const desperate = this.stage === VADER_STAGE.DESPERATE;

    const follow = desperate ? AI.FOLLOW_DESPERATE : AI.FOLLOW;
    this.vy += (player.cy - this.cy) * follow * dt;
    if (this.evasion.update(dt, this, world.playerBullets)) {
      this.vy = this.evasion.velocity;
      world.emit('enemyDodge', { enemy: this });
    }
    this.vy *= Math.exp(-AI.DAMPING * dt);
    this.y = clamp(this.y + this.vy * dt, AI.EDGE_MARGIN, CANVAS.HEIGHT - this.height - AI.EDGE_MARGIN);
    const desiredX = this.targetX + Math.sin(this.age * AI.SWAY_FREQ) * AI.SWAY_AMPLITUDE;
    this.x += (desiredX - this.x) * (1 - Math.exp(-AI.X_EASE * dt));

    this.updateFire(dt, world, desperate);

    if (this.stage !== VADER_STAGE.PURSUIT) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        // Fija la altura del jugador al empezar el aviso: si se mueve a tiempo, esquiva
        this.chargeY = clamp(player.cy - this.height / 2, AI.EDGE_MARGIN, CANVAS.HEIGHT - this.height - AI.EDGE_MARGIN);
        this.setMode(VADER_MODE.WINDUP, world);
      }
    }
  }

  windup(dt, world) {
    this.modeTimer -= dt;
    this.y += (this.chargeY - this.y) * (1 - Math.exp(-CHARGE.Y_EASE * dt));
    if (this.modeTimer <= 0) {
      this.y = this.chargeY;
      this.setMode(VADER_MODE.CHARGE, world);
    }
  }

  /** Progreso 0..1 del aviso de cañones antes de un par (para el renderer). */
  get cannonCharge() {
    return this.pairCharge > 0 ? 1 - this.pairCharge / PAIR.CHARGE : 0;
  }

  updateFire(dt, world, desperate) {
    if (desperate) this.updateLock(dt, world);
    // Mientras la mira trabaja no hay pares: un ataque peligroso a la vez
    if (this.lock.state !== LOCK_STATE.IDLE) return;

    if (this.pairCharge > 0) {
      this.pairCharge -= dt;
      if (this.pairCharge <= 0) this.firePair(world);
      return;
    }
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.pairCharge = PAIR.CHARGE;
      this.fireTimer = desperate ? PAIR.EVERY_DESPERATE : PAIR.EVERY;
    }
  }

  /** Dos láseres paralelos hacia donde estará el jugador. */
  firePair(world) {
    const speed = this.bulletSpeed() * PAIR.SPEED_FACTOR;
    const angle = interceptAngle({ x: this.x, y: this.cy }, world.player, speed, this.difficulty.aimLead);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (const side of [-1, 1]) {
      const ox = this.x + nx * side * PAIR.GAP;
      const oy = this.cy + ny * side * PAIR.GAP;
      world.spawnEnemyBullet(hostile(ox, oy, angle, speed, this.difficulty));
    }
  }

  /** Ciclo de la mira: espera → sigue al jugador → se fija → ráfaga al punto fijado. */
  updateLock(dt, world) {
    const lock = this.lock;
    const { player } = world;
    lock.timer -= dt;
    switch (lock.state) {
      case LOCK_STATE.IDLE:
        if (lock.timer <= 0 && this.mode === VADER_MODE.PURSUE) {
          Object.assign(lock, { state: LOCK_STATE.TRACKING, timer: LOCK.TRACK, x: player.cx, y: player.cy });
          world.emit('vaderLock', { boss: this });
        }
        break;
      case LOCK_STATE.TRACKING:
        lock.x += (player.cx - lock.x) * (1 - Math.exp(-LOCK.FOLLOW * dt));
        lock.y += (player.cy - lock.y) * (1 - Math.exp(-LOCK.FOLLOW * dt));
        if (lock.timer <= 0) Object.assign(lock, { state: LOCK_STATE.LOCKED, timer: LOCK.LOCKED });
        break;
      case LOCK_STATE.LOCKED:
        if (lock.timer <= 0) Object.assign(lock, { state: LOCK_STATE.FIRING, timer: 0, shotsLeft: LOCK.SHOTS });
        break;
      case LOCK_STATE.FIRING:
        if (lock.timer <= 0) {
          this.fireAtPoint(world, lock.x, lock.y);
          lock.shotsLeft--;
          lock.timer = LOCK.SHOT_GAP;
          if (lock.shotsLeft <= 0) Object.assign(lock, { state: LOCK_STATE.IDLE, timer: LOCK.EVERY });
        }
        break;
    }
  }

  fireAtPoint(world, x, y) {
    const speed = this.bulletSpeed() * LOCK.SPEED_FACTOR;
    const angle = Math.atan2(y - this.cy, x - this.x);
    world.spawnEnemyBullet(hostile(this.x, this.cy, angle, speed, this.difficulty, { thickness: 4 }));
  }

  /** Con el escudo activo los disparos rebotan. */
  hitTest(rect) {
    const hit = super.hitTest(rect);
    return hit && this.shielded ? HIT.ARMOR : hit;
  }
}
