import { rand } from '../core/utils.js';
import { LASER, LASER_STATE, RADIUS } from '../sim/bosses/DeathStar.js';
import { TURRETS } from '../sim/bosses/StarDestroyer.js';
import { LOCK_STATE, PAIR, VADER_MODE } from '../sim/bosses/TieAdvanced.js';
import { RENDER } from '../config.js';
import { PAL } from './art/palette.js';
import { drawSprite } from './art/SpriteCache.js';
import { px, rect, ring } from './pixel.js';

const HIT_FLASH = 'rgba(255, 255, 255, 0.35)';

/**
 * Dibujo de cada jefe, indexado por `boss.type`. `body` va bajo el jugador y `overlay` encima.
 * `assets` = { sprites, time, flash }. Para un jefe nuevo, añade aquí su entrada.
 * El destello de impacto no usa `ctx.filter` (no funciona en Safari): cada jefe lo pinta.
 */
export const BOSS_RENDERERS = {
  TIE_ADVANCED: { body: drawTieAdvanced, overlay: drawVaderOverlay, pixel: true },
  // Provisionales: vectores escalados al búfer. Se rehacen en pixel art en los pasos 4 y 5.
  STAR_DESTROYER: { body: drawStarDestroyer },
  DEATH_STAR: { body: drawDeathStar, overlay: drawSuperlaser },
};

/** Los jefes pixel dibujan en píxeles del búfer; los provisionales, en unidades de simulación escaladas. */
function inSpace(ctx, renderer, draw) {
  ctx.save();
  if (!renderer.pixel) ctx.scale(RENDER.SCALE, RENDER.SCALE);
  draw();
  ctx.restore();
}

export function drawBoss(ctx, boss, assets) {
  const renderer = BOSS_RENDERERS[boss.type];
  ctx.save();
  if (boss.dying) ctx.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
  inSpace(ctx, renderer, () => renderer.body(ctx, boss, { ...assets, flash: boss.hitFlash > 0 }));
  ctx.restore();
}

export function drawBossOverlay(ctx, boss, assets) {
  const renderer = BOSS_RENDERERS[boss.type];
  if (renderer.overlay) inSpace(ctx, renderer, () => renderer.overlay(ctx, boss, assets));
}

function drawTieAdvanced(ctx, boss, { sprites, flash, time }) {
  const cx = px(boss.cx);
  const cy = px(boss.cy);
  // Estela roja durante la embestida
  if (boss.mode === VADER_MODE.CHARGE) {
    for (let i = 0; i < 8; i++) rect(ctx, cx + 18 + i * 6, cy - 2 + (i % 2), 4, 3, i < 3 ? PAL.redHi : PAL.red);
  }
  // Halo rojo parpadeante durante el aviso de embestida
  if (boss.mode === VADER_MODE.WINDUP && Math.floor(time * 16) % 2) ring(ctx, cx, cy, 24, PAL.red, { dash: 3 });
  drawSprite(ctx, sprites.vader, cx, cy, { flash });
  // Aviso de par rápido: los cañones brillan antes de disparar
  if (boss.cannonCharge > 0 && Math.floor(time * 24) % 2 === 0) {
    const gap = px(PAIR.GAP);
    const x = cx - Math.floor(sprites.vader.w / 2) - 2;
    for (const dy of [-gap, gap]) {
      rect(ctx, x - 1, cy + dy - 1, 3, 3, PAL.redHi);
      rect(ctx, x, cy + dy, 1, 1, PAL.white);
    }
  }
}

/** Mira de Vader: esquinas que siguen al jugador; al fijarse parpadean en blanco. */
function drawLockReticle(ctx, lock, time) {
  if (lock.state === LOCK_STATE.IDLE) return;
  const locked = lock.state !== LOCK_STATE.TRACKING;
  if (locked && Math.floor(time * 16) % 2) return;
  const color = locked ? PAL.white : PAL.red;
  const x = px(lock.x);
  const y = px(lock.y);
  const r = locked ? 8 : 11;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    rect(ctx, x + sx * r - (sx > 0 ? 3 : 0), y + sy * r, 4, 1, color);
    rect(ctx, x + sx * r, y + sy * r - (sy > 0 ? 3 : 0), 1, 4, color);
  }
  rect(ctx, x, y, 1, 1, color);
}

/** Aviso de embestida (franja roja) y escudo deflector, por encima del jugador. */
function drawVaderOverlay(ctx, boss, { time }) {
  if (boss.dying) return;
  drawLockReticle(ctx, boss.lock, time);
  if (boss.mode === VADER_MODE.WINDUP) {
    const y = px(boss.chargeY);
    const h = px(boss.height);
    const w = px(boss.x);
    ctx.save();
    ctx.globalAlpha = 0.18;
    rect(ctx, 0, y, w, h, PAL.red);
    ctx.restore();
    if (Math.floor(time * 12) % 2) {
      for (let x = 0; x < w; x += 8) {
        rect(ctx, x, y, 4, 1, PAL.red);
        rect(ctx, x, y + h - 1, 4, 1, PAL.red);
      }
    }
  }
  if (boss.shielded) ring(ctx, px(boss.cx), px(boss.cy), 0, PAL.redHi, { rx: 28, ry: 24, dash: Math.floor(time * 8) % 2 ? 2 : 3 });
}

function drawStarDestroyer(ctx, boss, { time, flash }) {
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
  if (flash) {
    ctx.fillStyle = HIT_FLASH;
    ctx.fill();
  }

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

function drawDeathStar(ctx, boss, { time, flash }) {
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
  if (flash) {
    ctx.fillStyle = HIT_FLASH;
    ctx.fill();
  }

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
