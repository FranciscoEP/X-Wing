import { POWERUP_ITEM } from '../config.js';
import { rand } from '../core/utils.js';
import { FONT } from '../ui/theme.js';
import { drawSprite } from './art/SpriteCache.js';

// Sin shadowBlur por frame: el brillo lo aporta el bloom de render/post (o queda plano sin WebGL).

const ENGINE_COLOR = '#ff8c3c';
const SHIELD_COLOR = '#5ce1ff';
const ENGINE_OFFSETS = [-12, 12]; // px desde el centro, en las toberas del sprite

const LASER_COLORS = { friendly: '#ff4a4a', hostile: '#4dff6a' };

export function drawBullet(ctx, b) {
  const color = b.color ?? (b.friendly ? LASER_COLORS.friendly : LASER_COLORS.hostile);
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(-b.length / 2 - 2, -b.thickness, b.length + 4, b.thickness * 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(-b.length / 2, -b.thickness / 2, b.length, b.thickness);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-b.length / 2 + 2, -b.thickness / 4, b.length - 4, b.thickness / 2);
  ctx.restore();
}

/** Fuego de tobera: degradado radial aditivo, más largo cuanto más rápido avanza la nave. */
function engineFlame(ctx, x, y, length, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, length);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x - length * 0.4, y, length, radius, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** `sprites`: SpriteCache. */
export function drawPlayer(ctx, player, sprites, time) {
  if (player.dead) return;
  if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.cx, player.cy);
  ctx.rotate(player.tilt * 0.15);

  // Toberas: más largas cuanto más rápido avanza la nave
  ctx.globalCompositeOperation = 'lighter';
  const thrust = 10 + Math.max(0, player.vx) / 40 + rand(0, 3);
  for (const dy of ENGINE_OFFSETS) engineFlame(ctx, -player.width / 2 + 2, dy, thrust, 4, ENGINE_COLOR);
  ctx.globalCompositeOperation = 'source-over';

  drawSprite(ctx, sprites.player, 0, 0);

  if (player.shielded) {
    const left = player.powerUps.SHIELD;
    ctx.globalAlpha = left < 1.5 ? 0.35 + 0.3 * Math.sin(time * 20) : 0.5;
    ctx.strokeStyle = SHIELD_COLOR;
    ctx.fillStyle = 'rgba(92, 225, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.width * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemy(ctx, enemy, sprites) {
  const sprite = sprites.enemies[enemy.type];
  drawSprite(ctx, sprite, enemy.cx, enemy.cy, { flash: enemy.hitFlash > 0 });
}

export function drawPowerUp(ctx, p) {
  // Parpadea durante sus últimos segundos
  if (p.timeLeft < POWERUP_ITEM.BLINK_BEFORE_END && Math.floor(p.age * 8) % 2 === 0) return;
  const r = p.width / 2;
  const { color, icon } = p.cfg;
  ctx.save();
  ctx.translate(p.cx, p.cy);
  ctx.fillStyle = 'rgba(6, 12, 28, 0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(p.age * 2);
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, p.cx, p.cy + 1);
  ctx.restore();
}

export function drawTorpedo(ctx, t, time) {
  const r = t.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const trail = ctx.createLinearGradient(t.cx - 80, 0, t.cx, 0);
  trail.addColorStop(0, 'rgba(120, 200, 255, 0)');
  trail.addColorStop(1, 'rgba(160, 220, 255, 0.9)');
  ctx.fillStyle = trail;
  ctx.fillRect(t.cx - 80, t.cy - r / 2, 80, r);
  const core = ctx.createRadialGradient(t.cx, t.cy, 0, t.cx, t.cy, r * 1.6);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.4, '#9fdcff');
  core.addColorStop(1, 'rgba(80, 160, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r * 1.6 * (0.85 + 0.15 * Math.sin(time * 40)), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
