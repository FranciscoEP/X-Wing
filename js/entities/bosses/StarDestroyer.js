import { CANVAS } from '../../config.js';
import { rand } from '../../core/utils.js';
import { Boss } from './Boss.js';

/** Destructor Estelar: casco triangular, torretas y hangar que lanza TIE Fighters. */
export class StarDestroyer extends Boss {
  constructor(difficulty) {
    super(
      { name: 'Destructor Estelar clase Imperial', hp: 1200, score: 6000, width: 400, height: 190, targetX: CANVAS.WIDTH - 420, y: CANVAS.HEIGHT / 2 - 95 },
      difficulty
    );
    this.turretTimer = 1.5;
    this.broadsideTimer = 4;
    this.hangarTimer = 3;
    // Torretas relativas al casco (proporciones 0..1)
    this.turrets = [
      { u: 0.45, v: 0.5 },
      { u: 0.7, v: 0.32 },
      { u: 0.7, v: 0.68 },
    ];
  }

  behave(dt, world) {
    this.y = CANVAS.HEIGHT / 2 - this.height / 2 + Math.sin(this.age * 0.5) * 90;

    this.turretTimer -= dt;
    if (this.turretTimer <= 0) {
      this.turretTimer = this.enraged ? 0.55 : 0.9;
      const t = this.turrets[Math.floor(rand(0, this.turrets.length))];
      const tx = this.x + t.u * this.width;
      const ty = this.y + t.v * this.height;
      this.fireSpread(world, tx, ty, this.angleTo(world.player, tx, ty), { count: this.enraged ? 3 : 1, spread: 0.25 });
    }

    this.broadsideTimer -= dt;
    if (this.broadsideTimer <= 0) {
      this.broadsideTimer = this.enraged ? 3 : 4.5;
      this.fireSpread(world, this.x + 10, this.cy, Math.PI, { count: 11, spread: 1.6, speed: 260, size: 4, color: '#7dff8f' });
    }

    this.hangarTimer -= dt;
    if (this.hangarTimer <= 0) {
      this.hangarTimer = this.enraged ? 2.5 : 4;
      world.spawnEnemy('TIE_FIGHTER', this.cy + rand(-40, 40));
    }
  }

  /** Solo el triángulo del casco recibe impactos (no la caja completa). */
  hitTest(bullet) {
    const px = bullet.cx;
    const py = bullet.cy;
    if (px < this.x || px > this.x + this.width) return null;
    const halfSpan = ((px - this.x) / this.width) * (this.height / 2);
    return Math.abs(py - this.cy) <= halfSpan ? 'hit' : null;
  }

  drawBody(ctx, time) {
    const { x, y, width: w, height: h } = this;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#c9ced6');
    grad.addColorStop(0.5, '#8a929e');
    grad.addColorStop(1, '#4b525c');

    // Casco
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#2b3038';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Línea central y paneles
    ctx.strokeStyle = 'rgba(40, 45, 55, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    for (let i = 1; i < 6; i++) {
      const px = x + (w * i) / 6;
      const span = (i / 6) * (h / 2);
      ctx.moveTo(px, y + h / 2 - span);
      ctx.lineTo(px, y + h / 2 + span);
    }
    ctx.stroke();

    // Torre de mando
    ctx.fillStyle = '#9aa1ab';
    ctx.fillRect(x + w * 0.78, y + h / 2 - 22, 50, 44);
    ctx.fillStyle = '#6b727c';
    ctx.fillRect(x + w * 0.84, y + h / 2 - 36, 26, 72);

    // Motores
    const glow = 0.6 + Math.sin(time * 10) * 0.2;
    ctx.fillStyle = `rgba(120, 190, 255, ${glow})`;
    ctx.shadowColor = '#78beff';
    ctx.shadowBlur = 20;
    for (const v of [0.25, 0.5, 0.75]) {
      ctx.beginPath();
      ctx.arc(x + w + 4, y + v * h, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Torretas
    ctx.fillStyle = '#ff5050';
    for (const t of this.turrets) {
      ctx.beginPath();
      ctx.arc(x + t.u * w, y + t.v * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
