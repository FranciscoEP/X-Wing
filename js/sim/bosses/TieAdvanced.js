import { CANVAS, FORMATION } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';
import { Evasion } from '../ai/evasion.js';
import { spawnSquadron } from '../ai/formations.js';
import { Boss, HIT } from './Boss.js';

/**
 * Etapas de combate según la vida restante. Cada una añade comportamientos a la anterior:
 * PURSUIT: persigue y dispara ráfagas · ASSAULT: además embiste · DESPERATE: además escudo y escoltas.
 */
export const VADER_STAGE = {
  PURSUIT: { id: 'PURSUIT', minHp: 0.66, label: 'Vader te persigue' },
  ASSAULT: { id: 'ASSAULT', minHp: 0.33, label: '¡Vader embiste!' },
  DESPERATE: { id: 'DESPERATE', minHp: 0, label: 'Escudo deflector y escoltas' },
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
  BURST_SHOTS: 3,
  BURST_SHOTS_DESPERATE: 5,
  BURST_INTERVAL: 0.12,
  PAUSE: 1.2,
  PAUSE_DESPERATE: 0.7,
  FAN_CHANCE: 0.4,
  FAN_SHOTS: 7,
  FAN_SPREAD: 1.1,
  FAN_PAUSE: 1.1,
};

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
    this.fireTimer = 1;
    this.burstLeft = 0;
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

  updateFire(dt, world, desperate) {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    if (this.burstLeft > 0) {
      this.burstLeft--;
      this.fireAt(world, this.x, this.cy);
      this.fireTimer = AI.BURST_INTERVAL;
    } else if (desperate && rand(0, 1) < AI.FAN_CHANCE) {
      this.fireSpread(world, this.x, this.cy, Math.PI, { count: AI.FAN_SHOTS, spread: AI.FAN_SPREAD });
      this.fireTimer = AI.FAN_PAUSE;
    } else {
      this.burstLeft = desperate ? AI.BURST_SHOTS_DESPERATE : AI.BURST_SHOTS;
      this.fireTimer = desperate ? AI.PAUSE_DESPERATE : AI.PAUSE;
    }
  }

  /** Con el escudo activo los disparos rebotan. */
  hitTest(rect) {
    const hit = super.hitTest(rect);
    return hit && this.shielded ? HIT.ARMOR : hit;
  }
}
