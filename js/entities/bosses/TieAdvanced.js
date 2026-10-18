import { CANVAS } from '../../config.js';
import { clamp } from '../../core/utils.js';
import { Boss } from './Boss.js';

/** Darth Vader: rápido, sigue al jugador y alterna ráfagas apuntadas con abanicos. */
export class TieAdvanced extends Boss {
  constructor(difficulty, sprite) {
    super(
      { name: 'TIE Advanced x1 — Darth Vader', hp: 600, score: 3000, width: 110, height: 92, targetX: CANVAS.WIDTH - 200, y: CANVAS.HEIGHT / 2 - 46 },
      difficulty
    );
    this.sprite = sprite;
    this.fireTimer = 1;
    this.burstLeft = 0;
    this.dashTimer = 4;
    this.vy = 0;
    // Vader va en una nave más oscura
    this.baseFilter = 'brightness(0.7) contrast(1.3)';
  }

  behave(dt, world) {
    const { player } = world;
    // Persigue la altura del jugador con inercia
    const follow = this.enraged ? 4 : 2.5;
    this.vy += (player.cy - this.cy) * follow * dt;
    this.vy *= Math.exp(-2.5 * dt);
    this.y = clamp(this.y + this.vy * dt, 10, CANVAS.HEIGHT - this.height - 10);
    this.x = this.targetX + Math.sin(this.age * 0.8) * 60;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      if (this.burstLeft > 0) {
        this.burstLeft--;
        this.fireSpread(world, this.x, this.cy, this.angleTo(player));
        this.fireTimer = 0.12;
      } else if (this.enraged && Math.random() < 0.4) {
        this.fireSpread(world, this.x, this.cy, Math.PI, { count: 7, spread: 1.1 });
        this.fireTimer = 1.1;
      } else {
        this.burstLeft = this.enraged ? 5 : 3;
        this.fireTimer = this.enraged ? 0.7 : 1.2;
      }
    }
  }

  drawBody(ctx) {
    ctx.shadowColor = '#ff2e2e';
    ctx.shadowBlur = 18;
    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    }
  }
}
