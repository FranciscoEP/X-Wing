import { rand } from '../core/utils.js';
import { LASER, LASER_STATE, RADIUS } from '../sim/bosses/DeathStar.js';
import { TURRETS } from '../sim/bosses/StarDestroyer.js';

/**
 * Dibujo de cada jefe, indexado por `boss.type`. `body` va bajo el jugador y `overlay` encima.
 * Para un jefe nuevo, añade aquí su entrada.
 */
export const BOSS_RENDERERS = {
  TIE_ADVANCED: { body: drawTieAdvanced, filter: 'brightness(0.7) contrast(1.3)' },
  STAR_DESTROYER: { body: drawStarDestroyer },
  DEATH_STAR: { body: drawDeathStar, overlay: drawSuperlaser },
};

export function drawBoss(ctx, boss, assets) {
  const renderer = BOSS_RENDERERS[boss.type];
  ctx.save();
  const filter = `${renderer.filter ?? ''} ${boss.hitFlash > 0 ? 'brightness(1.8)' : ''}`.trim();
  if (filter) ctx.filter = filter;
  if (boss.dying) ctx.translate(rand(-3, 3), rand(-3, 3));
  renderer.body(ctx, boss, assets);
  ctx.restore();
}

export function drawBossOverlay(ctx, boss, assets) {
  BOSS_RENDERERS[boss.type].overlay?.(ctx, boss, assets);
}

function drawTieAdvanced(ctx, boss, { images }) {
  ctx.shadowColor = '#ff2e2e';
  ctx.shadowBlur = 18;
  if (images.tie) ctx.drawImage(images.tie, boss.x, boss.y, boss.width, boss.height);
}

function drawStarDestroyer(ctx, boss, { time }) {
  const { x, y, width: w, height: h } = boss;
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
  for (const t of TURRETS) {
    ctx.beginPath();
    ctx.arc(x + t.u * w, y + t.v * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDeathStar(ctx, boss, { time }) {
  const { cx, cy } = boss;

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
  const { x: dx, y: dy } = boss.dish;
  ctx.fillStyle = '#4a505a';
  ctx.strokeStyle = '#2c3038';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dx, dy, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (boss.laserState === LASER_STATE.CHARGING) {
    const p = 1 - boss.laserTimer / LASER.CHARGE;
    ctx.fillStyle = `rgba(77, 255, 106, ${0.3 + p * 0.7})`;
    ctx.shadowColor = '#4dff6a';
    ctx.shadowBlur = 30 * p;
    ctx.beginPath();
    ctx.arc(dx, dy, 10 + p * 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Aviso de la línea de fuego
    const beam = boss.beam;
    ctx.strokeStyle = `rgba(77, 255, 106, ${0.25 + 0.25 * Math.sin(time * 30)})`;
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
    ctx.setLineDash([]);
  }

  // Puerto de escape (punto débil)
  const port = boss.port;
  const pulse = 0.6 + 0.4 * Math.sin(time * 8);
  ctx.fillStyle = '#111';
  ctx.strokeStyle = `rgba(255, 210, 60, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ffd23c';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(port.x + port.width / 2, port.y + port.height / 2, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawSuperlaser(ctx, boss) {
  if (boss.laserState !== LASER_STATE.FIRING || boss.dying) return;
  const beam = boss.beam;
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
