import { CANVAS } from '../../config.js';
import { centerOf, rand } from '../../core/utils.js';
import { Boss, HIT } from './Boss.js';

const AI = {
  DRIFT_AMPLITUDE: 90,
  DRIFT_FREQ: 0.5,
  TURRET_EVERY: 0.9,
  TURRET_EVERY_ENRAGED: 0.55,
  TURRET_SPREAD: 0.25,
  BROADSIDE_EVERY: 4.5,
  BROADSIDE_EVERY_ENRAGED: 3,
  BROADSIDE: { count: 11, spread: 1.6, speed: 260, size: 4, color: '#7dff8f' },
  HANGAR_EVERY: 4,
  HANGAR_EVERY_ENRAGED: 2.5,
  HANGAR_Y_JITTER: 40,
};

/** Torretas en coordenadas relativas al casco (0..1). */
export const TURRETS = [
  { u: 0.45, v: 0.5 },
  { u: 0.7, v: 0.32 },
  { u: 0.7, v: 0.68 },
];

/** Destructor Estelar: casco triangular, torretas y hangar que lanza TIE Fighters. */
export class StarDestroyer extends Boss {
  constructor(difficulty) {
    super('STAR_DESTROYER', { targetX: CANVAS.WIDTH - 420, y: CANVAS.HEIGHT / 2 - 95 }, difficulty);
    this.turretTimer = 1.5;
    this.broadsideTimer = 4;
    this.hangarTimer = 3;
  }

  behave(dt, world) {
    this.y = CANVAS.HEIGHT / 2 - this.height / 2 + Math.sin(this.age * AI.DRIFT_FREQ) * AI.DRIFT_AMPLITUDE;

    this.turretTimer -= dt;
    if (this.turretTimer <= 0) {
      this.turretTimer = this.enraged ? AI.TURRET_EVERY_ENRAGED : AI.TURRET_EVERY;
      const t = TURRETS[Math.floor(rand(0, TURRETS.length))];
      const tx = this.x + t.u * this.width;
      const ty = this.y + t.v * this.height;
      this.fireSpread(world, tx, ty, this.angleTo(world.player, tx, ty), { count: this.enraged ? 3 : 1, spread: AI.TURRET_SPREAD });
    }

    this.broadsideTimer -= dt;
    if (this.broadsideTimer <= 0) {
      this.broadsideTimer = this.enraged ? AI.BROADSIDE_EVERY_ENRAGED : AI.BROADSIDE_EVERY;
      this.fireSpread(world, this.x + 10, this.cy, Math.PI, AI.BROADSIDE);
    }

    this.hangarTimer -= dt;
    if (this.hangarTimer <= 0) {
      this.hangarTimer = this.enraged ? AI.HANGAR_EVERY_ENRAGED : AI.HANGAR_EVERY;
      world.spawnEnemy('TIE_FIGHTER', { y: this.cy + rand(-AI.HANGAR_Y_JITTER, AI.HANGAR_Y_JITTER) });
    }
  }

  /** Solo el triángulo del casco recibe impactos (no la caja completa). */
  hitTest(rect) {
    const { x: px, y: py } = centerOf(rect);
    if (px < this.x || px > this.x + this.width) return null;
    const halfSpan = ((px - this.x) / this.width) * (this.height / 2);
    return Math.abs(py - this.cy) <= halfSpan ? HIT.DAMAGE : null;
  }
}
