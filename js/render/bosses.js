import { rand } from '../core/utils.js';
import { LASER, LASER_STATE, RADIUS } from '../sim/bosses/DeathStar.js';
import { ATTACK } from '../sim/bosses/StarDestroyer.js';
import { paintStarDestroyerHull } from './art/starDestroyer.js';
import { LOCK_STATE, PAIR, VADER_MODE } from '../sim/bosses/TieAdvanced.js';
import { RENDER } from '../config.js';
import { PAL } from './art/palette.js';
import { drawSprite } from './art/SpriteCache.js';
import { circle, line, px, rect, ring } from './pixel.js';

const HIT_FLASH = 'rgba(255, 255, 255, 0.35)';

/**
 * Dibujo de cada jefe, indexado por `boss.type`. `body` va bajo el jugador y `overlay` encima.
 * `assets` = { sprites, time, flash }. Para un jefe nuevo, añade aquí su entrada.
 * El destello de impacto no usa `ctx.filter` (no funciona en Safari): cada jefe lo pinta.
 */
export const BOSS_RENDERERS = {
  TIE_ADVANCED: { body: drawTieAdvanced, overlay: drawVaderOverlay, pixel: true },
  // Provisionales: vectores escalados al búfer. Se rehacen en pixel art en los pasos 4 y 5.
  STAR_DESTROYER: { body: drawStarDestroyer, overlay: drawSweepBeam, pixel: true },
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

// ------------------------------------------------------------------ Destructor Estelar

let sdHull = null; // casco precalculado (se pinta una sola vez)

function drawStarDestroyer(ctx, boss, { time, flash }) {
  const w = px(boss.width);
  const h = px(boss.height);
  sdHull ??= paintStarDestroyerHull(w, h);
  const x = px(boss.x);
  const y = px(boss.y);
  ctx.drawImage(sdHull, x - 1, y - 1);

  // Toberas: parpadeo azul
  const glow = Math.floor(time * 10) % 2 ? PAL.cyan : PAL.glass;
  for (const v of [0.3, 0.5, 0.7]) rect(ctx, x + w, y + Math.round(v * h) - 3, 3, 6, glow);

  for (const part of boss.parts) drawPart(ctx, boss, part, time, flash);
}

/** Cada parte según su estado: intacta, avisando (parpadea), blindada (puente) o destruida. */
function drawPart(ctx, boss, part, time) {
  const r = boss.rectOf(part);
  const x = px(r.x);
  const y = px(r.y);
  const w = px(r.width);
  const h = px(r.height);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);

  if (part.destroyed) {
    // Restos humeantes
    rect(ctx, x + 2, y + 2, w - 4, h - 4, PAL.ink);
    if (Math.floor(time * 6 + cx) % 3 === 0) rect(ctx, cx - 1, cy - 1, 2, 2, PAL.orange);
    rect(ctx, cx + 2, cy - 3, 1, 1, PAL.dark);
    return;
  }
  const hit = part.hitFlash > 0;
  const warn = part.charge > 0 && Math.floor(time * (10 + part.charge * 20)) % 2 === 0;

  if (part.id === 'BRIDGE') {
    const armored = !boss.bridgeExposed;
    rect(ctx, x, y, w, h, PAL.outline);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, hit ? PAL.white : armored ? PAL.dark : PAL.imperial);
    rect(ctx, x + 4, y + 6, w - 8, 3, armored ? PAL.ink : PAL.yellow); // ventanal del puente
    // Generadores de escudo: azules mientras está blindado
    for (const dx of [5, w - 8]) circle(ctx, x + dx + 1, y - 2, 2, armored ? PAL.cyan : PAL.dark);
    if (warn) rect(ctx, x - 2, cy - 1, 2, 3, PAL.redHi);
    return;
  }
  if (part.id === 'HANGAR') {
    rect(ctx, x, y, w, h, PAL.outline);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, hit ? PAL.white : PAL.dark);
    // Compuerta: se abre (amarilla) al lanzar un TIE
    rect(ctx, x + 4, y + 4, w - 8, h - 8, warn ? PAL.yellow : PAL.ink);
    return;
  }
  // Torretas: base, cañón y luz de aviso
  circle(ctx, cx, cy, Math.floor(w / 2), PAL.outline);
  circle(ctx, cx, cy, Math.floor(w / 2) - 1, hit ? PAL.white : PAL.imperialDk);
  rect(ctx, cx - Math.floor(w / 2) - 4, cy - 1, 6, 2, PAL.mid);
  rect(ctx, cx - 1, cy - 1, 3, 3, warn ? PAL.white : PAL.red);
}

/** Aviso y rayo del cañón de barrido, por encima del jugador. */
function drawSweepBeam(ctx, boss, { time }) {
  const beam = boss.beam;
  if (!beam || boss.dying) return;
  const o = boss.beamOrigin;
  const ox = px(o.x);
  const oy = px(o.y);
  const len = px(ATTACK.BEAM.length);
  if (beam.phase === 'charge') {
    // El cono que va a barrer, con sus dos bordes punteados
    if (Math.floor(time * 14) % 2) return;
    for (const a of [beam.from, beam.to]) {
      for (let i = 8; i < len; i += 5) rect(ctx, ox + Math.cos(a) * i, oy + Math.sin(a) * i, 2, 1, PAL.red);
    }
    return;
  }
  const dx = Math.cos(beam.angle);
  const dy = Math.sin(beam.angle);
  line(ctx, ox, oy, ox + dx * len, oy + dy * len, PAL.red, 4);
  line(ctx, ox, oy + 1, ox + dx * len, oy + dy * len + 1, PAL.white, 2);
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
