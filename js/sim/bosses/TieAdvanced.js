import { CANVAS } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';
import { Boss } from './Boss.js';

const AI = {
  FOLLOW: 2.5,
  FOLLOW_ENRAGED: 4,
  DAMPING: 2.5,
  SWAY_AMPLITUDE: 60,
  SWAY_FREQ: 0.8,
  EDGE_MARGIN: 10,
  BURST_SHOTS: 3,
  BURST_SHOTS_ENRAGED: 5,
  BURST_INTERVAL: 0.12,
  PAUSE: 1.2,
  PAUSE_ENRAGED: 0.7,
  FAN_CHANCE: 0.4,
  FAN_SHOTS: 7,
  FAN_SPREAD: 1.1,
  FAN_PAUSE: 1.1,
};

/** Darth Vader: sigue la altura del jugador y alterna ráfagas apuntadas con abanicos. */
export class TieAdvanced extends Boss {
  constructor(difficulty) {
    super('TIE_ADVANCED', { targetX: CANVAS.WIDTH - 200, y: CANVAS.HEIGHT / 2 - 46 }, difficulty);
    this.fireTimer = 1;
    this.burstLeft = 0;
    this.vy = 0;
  }

  behave(dt, world) {
    const { player } = world;
    const follow = this.enraged ? AI.FOLLOW_ENRAGED : AI.FOLLOW;
    this.vy += (player.cy - this.cy) * follow * dt;
    this.vy *= Math.exp(-AI.DAMPING * dt);
    this.y = clamp(this.y + this.vy * dt, AI.EDGE_MARGIN, CANVAS.HEIGHT - this.height - AI.EDGE_MARGIN);
    this.x = this.targetX + Math.sin(this.age * AI.SWAY_FREQ) * AI.SWAY_AMPLITUDE;

    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    if (this.burstLeft > 0) {
      this.burstLeft--;
      this.fireSpread(world, this.x, this.cy, this.angleTo(player));
      this.fireTimer = AI.BURST_INTERVAL;
    } else if (this.enraged && rand(0, 1) < AI.FAN_CHANCE) {
      this.fireSpread(world, this.x, this.cy, Math.PI, { count: AI.FAN_SHOTS, spread: AI.FAN_SPREAD });
      this.fireTimer = AI.FAN_PAUSE;
    } else {
      this.burstLeft = this.enraged ? AI.BURST_SHOTS_ENRAGED : AI.BURST_SHOTS;
      this.fireTimer = this.enraged ? AI.PAUSE_ENRAGED : AI.PAUSE;
    }
  }
}
