import { CANVAS } from '../../config.js';
import { overlaps } from '../../core/utils.js';
import { Boss } from './Boss.js';

const RADIUS = 210;
const LASER = { CHARGE: 1.8, FIRE: 1.1, COOLDOWN: 5.5, HEIGHT: 46, DPS: 45 };

/**
 * Estrella de la Muerte: solo el puerto de escape (punto débil) recibe daño.
 * Cada cierto tiempo fija la altura del jugador y dispara el superláser.
 */
export class DeathStar extends Boss {
  constructor(difficulty) {
    super(
      { name: 'Estrella de la Muerte', hp: 700, score: 15000, width: RADIUS * 2, height: RADIUS * 2, targetX: CANVAS.WIDTH - RADIUS - 40, y: CANVAS.HEIGHT / 2 - RADIUS },
      difficulty
    );
    this.ringTimer = 2;
    this.laserState = 'idle';
    this.laserTimer = 4;
    this.laserY = 0;
    this.portAngle = Math.PI;
  }

  get port() {
    // El puerto de escape orbita en la cara visible
    const r = RADIUS * 0.8;
    return {
      x: this.cx + Math.cos(this.portAngle) * r - 14,
      y: this.cy + Math.sin(this.portAngle) * r - 14,
      width: 28,
      height: 28,
    };
  }

  get dish() {
    return { x: this.cx - RADIUS * 0.45, y: this.cy - RADIUS * 0.35 };
  }

  behave(dt, world) {
    this.portAngle = Math.PI + Math.sin(this.age * (this.enraged ? 0.9 : 0.6)) * 1.15;
    this.y = CANVAS.HEIGHT / 2 - RADIUS + Math.sin(this.age * 0.3) * 30;

    this.ringTimer -= dt;
    if (this.ringTimer <= 0) {
      this.ringTimer = this.enraged ? 1.6 : 2.4;
      const { x, y } = this.dish;
      this.fireSpread(world, x, y, Math.PI, { count: this.enraged ? 9 : 7, spread: 1.4, speed: 240, size: 4 });
    }

    this.updateSuperlaser(dt, world);
  }

  updateSuperlaser(dt, world) {
    this.laserTimer -= dt;
    if (this.laserState === 'idle' && this.laserTimer <= 0) {
      this.laserState = 'charging';
      this.laserTimer = LASER.CHARGE;
      this.laserY = world.player.cy;
    } else if (this.laserState === 'charging' && this.laserTimer <= 0) {
      this.laserState = 'firing';
      this.laserTimer = LASER.FIRE;
      world.effects.shake(14, 0.6);
      world.effects.flash('#4dff6a', 0.25);
    } else if (this.laserState === 'firing') {
      const beam = this.beamRect();
      if (overlaps(beam, world.player, 10)) world.damagePlayer(LASER.DPS * dt, { silent: true });
      if (this.laserTimer <= 0) {
        this.laserState = 'idle';
        this.laserTimer = LASER.COOLDOWN * (this.enraged ? 0.7 : 1);
      }
    }
  }

  beamRect() {
    return { x: 0, y: this.laserY - LASER.HEIGHT / 2, width: this.dish.x, height: LASER.HEIGHT };
  }

  hitTest(bullet) {
    if (overlaps(bullet, this.port)) return 'hit';
    const dx = bullet.cx - this.cx;
    const dy = bullet.cy - this.cy;
    return dx * dx + dy * dy < RADIUS * RADIUS ? 'armor' : null;
  }

  drawBody(ctx, time) {
    const { cx, cy } = this;

    // Esfera
    const grad = ctx.createRadialGradient(cx - 70, cy - 70, 20, cx, cy, RADIUS);
    grad.addColorStop(0, '#b8bec8');
    grad.addColorStop(0.7, '#6f7682');
    grad.addColorStop(1, '#2c3038');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Trinchera ecuatorial y paneles
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#353a43';
    ctx.fillRect(cx - RADIUS, cy - 5, RADIUS * 2, 10);
    ctx.strokeStyle = 'rgba(30, 33, 40, 0.5)';
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, RADIUS, Math.abs(i) * 45 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Plato del superláser
    const { x: dx, y: dy } = this.dish;
    ctx.fillStyle = '#4a505a';
    ctx.strokeStyle = '#2c3038';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dx, dy, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.laserState === 'charging') {
      const p = 1 - this.laserTimer / LASER.CHARGE;
      ctx.fillStyle = `rgba(77, 255, 106, ${0.3 + p * 0.7})`;
      ctx.shadowColor = '#4dff6a';
      ctx.shadowBlur = 30 * p;
      ctx.beginPath();
      ctx.arc(dx, dy, 10 + p * 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Aviso de la línea de fuego
      ctx.strokeStyle = `rgba(77, 255, 106, ${0.25 + 0.25 * Math.sin(time * 30)})`;
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 2;
      ctx.strokeRect(0, this.laserY - LASER.HEIGHT / 2, dx, LASER.HEIGHT);
      ctx.setLineDash([]);
    }

    // Puerto de escape (punto débil)
    const port = this.port;
    const pulse = 0.6 + 0.4 * Math.sin(time * 8);
    ctx.fillStyle = '#111';
    ctx.strokeStyle = `rgba(255, 210, 60, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffd23c';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(port.x + 14, port.y + 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /** El rayo se dibuja aparte, por encima del jugador. */
  drawOverlay(ctx) {
    if (this.laserState !== 'firing' || this.dying) return;
    const beam = this.beamRect();
    const g = ctx.createLinearGradient(0, beam.y, 0, beam.y + beam.height);
    g.addColorStop(0, 'rgba(77, 255, 106, 0)');
    g.addColorStop(0.5, 'rgba(220, 255, 220, 1)');
    g.addColorStop(1, 'rgba(77, 255, 106, 0)');
    ctx.save();
    ctx.shadowColor = '#4dff6a';
    ctx.shadowBlur = 30;
    ctx.fillStyle = g;
    ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
    ctx.restore();
  }
}
