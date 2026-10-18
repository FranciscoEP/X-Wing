import { PHASE_BANNER_TIME, PHASE_TYPE, PHASES } from '../config.js';
import { rand, weightedChoice } from '../core/utils.js';

const INTERVAL_JITTER = 0.25; // ± fracción de `squadronEvery`: las oleadas no llegan a compás

export const PHASE_STATUS = { IDLE: 'idle', INTRO: 'intro', ACTIVE: 'active', CLEAR: 'clear', DONE: 'done' };

/**
 * Secuencia de fases: INTRO (cartel) → ACTIVE → CLEAR (cartel) → siguiente fase.
 * Notifica a quien la usa mediante callbacks; no conoce entidades ni render.
 */
export class PhaseManager {
  constructor({ onPhaseStart = () => {}, onPhaseClear = () => {}, onVictory = () => {} } = {}, phases = PHASES) {
    this.callbacks = { onPhaseStart, onPhaseClear, onVictory };
    this.phases = phases;
    this.index = -1;
    this.status = PHASE_STATUS.IDLE;
    this.lastClearFlawless = false;
  }

  get phase() {
    return this.phases[this.index];
  }

  get number() {
    return this.index + 1;
  }

  get total() {
    return this.phases.length;
  }

  get isActive() {
    return this.status === PHASE_STATUS.ACTIVE;
  }

  get bannerProgress() {
    return 1 - this.timer / PHASE_BANNER_TIME;
  }

  start(fromIndex = 0) {
    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= this.phases.length) {
      throw new RangeError(`Fase inicial inválida: ${fromIndex}`);
    }
    this.index = fromIndex - 1;
    this.next();
  }

  next() {
    this.index++;
    if (this.index >= this.phases.length) {
      this.status = PHASE_STATUS.DONE;
      this.callbacks.onVictory();
      return;
    }
    this.status = PHASE_STATUS.INTRO;
    this.timer = PHASE_BANNER_TIME;
    this.spawned = 0;
    this.resolved = 0; // destruidos + escapados
    this.killed = 0;
    this.spawnTimer = 0;
    this.lastSquadron = null;
    this.damageTaken = 0;
  }

  /** Marca la fase actual como superada (al vaciar la oleada o al vencer al jefe). */
  clear() {
    if (!this.isActive) return;
    this.status = PHASE_STATUS.CLEAR;
    this.timer = PHASE_BANNER_TIME;
    this.lastClearFlawless = this.damageTaken === 0;
    this.callbacks.onPhaseClear(this.phase, this.lastClearFlawless);
  }

  update(dt) {
    if (this.status !== PHASE_STATUS.INTRO && this.status !== PHASE_STATUS.CLEAR) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.status === PHASE_STATUS.INTRO) {
      this.status = PHASE_STATUS.ACTIVE;
      this.callbacks.onPhaseStart(this.phase);
    } else {
      this.next();
    }
  }

  /**
   * Devuelve el siguiente escuadrón ({ formation, size }) cuando toca generarlo, o null.
   * Elige de `phase.squadrons` al azar según su `weight`, sin repetir el anterior, con un
   * intervalo variable, y recorta el último para no pasar de `count`.
   */
  nextSquadron(dt) {
    const p = this.phase;
    if (!this.isActive || p.type !== PHASE_TYPE.WAVE || this.spawned >= p.count) return null;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return null;
    this.spawnTimer = p.squadronEvery * rand(1 - INTERVAL_JITTER, 1 + INTERVAL_JITTER);
    const options = p.squadrons.length > 1 ? p.squadrons.filter((s) => s !== this.lastSquadron) : p.squadrons;
    const spec = weightedChoice(options);
    this.lastSquadron = spec;
    const size = Math.min(spec.size, p.count - this.spawned);
    this.spawned += size;
    return { formation: spec.formation, size };
  }

  recordDamage(amount) {
    this.damageTaken += amount;
  }

  recordWaveEnemyGone({ killed }) {
    this.resolved++;
    if (killed) this.killed++;
    if (this.phase.type === PHASE_TYPE.WAVE && this.resolved >= this.phase.count) this.clear();
  }
}
