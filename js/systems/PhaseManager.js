import { PHASES } from '../config.js';

const BANNER_TIME = 2.5;

/**
 * Secuencia de fases: 'intro' (cartel) → 'active' → 'clear' (cartel) → siguiente fase.
 * El Game consulta `canSpawn`, `phase` y recibe callbacks de inicio/fin.
 */
export class PhaseManager {
  constructor({ onPhaseStart, onPhaseClear, onVictory }) {
    this.callbacks = { onPhaseStart, onPhaseClear, onVictory };
    this.index = -1;
  }

  get phase() {
    return PHASES[this.index];
  }

  get number() {
    return this.index + 1;
  }

  get total() {
    return PHASES.length;
  }

  get canSpawn() {
    return this.status === 'active';
  }

  start(fromIndex = 0) {
    this.index = fromIndex - 1;
    this.next();
  }

  next() {
    this.index++;
    if (this.index >= PHASES.length) {
      this.status = 'done';
      this.callbacks.onVictory();
      return;
    }
    this.status = 'intro';
    this.timer = BANNER_TIME;
    this.spawned = 0;
    this.resolved = 0; // destruidos + escapados
    this.killed = 0;
    this.spawnTimer = 0;
    this.damageTaken = 0;
  }

  /** Marca la fase actual como superada (se llama al vaciar la oleada o al vencer al jefe). */
  clear() {
    if (this.status !== 'active') return;
    this.status = 'clear';
    this.timer = BANNER_TIME;
    this.callbacks.onPhaseClear(this.phase, this.damageTaken === 0);
  }

  update(dt) {
    if (this.status === 'intro' || this.status === 'clear') {
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.status === 'intro') {
        this.status = 'active';
        this.callbacks.onPhaseStart(this.phase);
      } else {
        this.next();
      }
    }
  }

  /** Devuelve true cuando toca generar otro enemigo de la oleada. */
  shouldSpawnWaveEnemy(dt) {
    const p = this.phase;
    if (!this.canSpawn || p.type !== 'WAVE' || this.spawned >= p.count) return false;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return false;
    this.spawnTimer = p.spawnEvery;
    this.spawned++;
    return true;
  }

  recordWaveEnemyGone(killed) {
    this.resolved++;
    if (killed) this.killed++;
    if (this.phase.type === 'WAVE' && this.resolved >= this.phase.count) this.clear();
  }

  get bannerProgress() {
    return 1 - this.timer / BANNER_TIME;
  }
}
