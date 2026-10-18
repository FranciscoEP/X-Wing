import { POWERUP_ITEM } from '../config.js';
import { rand } from '../core/utils.js';
import { PAL } from './art/palette.js';
import { XWING_ENGINES } from './art/pixelArt.js';
import { drawSprite } from './art/SpriteCache.js';
import { circle, line, px, rect, ring, text } from './pixel.js';

// Todas las posiciones de la simulación se pasan a píxeles del búfer con `px` antes de dibujar.

const LASER = { friendly: PAL.red, hostile: PAL.green };
const POWERUP_ICONS = { TRIPLE_SHOT: 'T', RAPID_FIRE: 'R', SHIELD: 'S', REPAIR: '+', TORPEDO: 'B' };

/** Rayo de 2 px de grosor; la punta delantera es blanca. */
export function drawBullet(ctx, b) {
  const color = b.color ?? (b.friendly ? LASER.friendly : LASER.hostile);
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const dx = b.vx / speed;
  const dy = b.vy / speed;
  const len = Math.max(3, px(b.length));
  const cx = px(b.cx);
  const cy = px(b.cy);
  const x0 = cx - (dx * len) / 2;
  const y0 = cy - (dy * len) / 2;
  const x1 = cx + (dx * len) / 2;
  const y1 = cy + (dy * len) / 2;
  const size = b.thickness > 3 ? 3 : 2;
  line(ctx, x0, y0, x1, y1, color, size);
  rect(ctx, x1 - (dx > 0 ? 1 : 0), y1, 2, size, PAL.white);
}

export function drawPlayer(ctx, player, sprites, time) {
  if (player.dead) return;
  if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
  const cx = px(player.cx);
  const cy = px(player.cy);

  // Fuego de toberas: 2–4 px que parpadean, más largos al acelerar
  const flame = 2 + Math.round(Math.max(0, player.vx) / 120) + (rand(0, 1) < 0.5 ? 1 : 0);
  for (const [ex, ey] of XWING_ENGINES) {
    rect(ctx, cx + ex - flame, cy + ey, flame, 2, PAL.orange);
    rect(ctx, cx + ex - 1, cy + ey, 1, 2, PAL.yellow);
  }
  drawSprite(ctx, sprites.player, cx, cy);

  if (player.shielded) {
    const left = player.powerUps.SHIELD;
    if (left > 1.5 || Math.floor(time * 10) % 2) ring(ctx, cx, cy, 0, PAL.cyan, { rx: 22, ry: 15, dash: 2 });
  }
}

/** Zona vulnerable visible en modo foco (o al depurar). */
export function drawHitbox(ctx, box) {
  rect(ctx, px(box.x), px(box.y), Math.max(1, px(box.width)), Math.max(1, px(box.height)), PAL.white);
}

export function drawEnemy(ctx, enemy, sprites) {
  drawSprite(ctx, sprites.enemies[enemy.type], px(enemy.cx), px(enemy.cy), { flash: enemy.hitFlash > 0 });
}

export function drawPowerUp(ctx, p) {
  if (p.timeLeft < POWERUP_ITEM.BLINK_BEFORE_END && Math.floor(p.age * 8) % 2 === 0) return;
  const cx = px(p.cx);
  const cy = px(p.cy);
  circle(ctx, cx, cy, 7, PAL.outline);
  circle(ctx, cx, cy, 6, p.cfg.color);
  circle(ctx, cx, cy, 4, PAL.ink);
  text(ctx, POWERUP_ICONS[p.type] ?? '?', cx + 1, cy + 1, p.cfg.color);
}

export function drawTorpedo(ctx, t, time) {
  const cx = px(t.cx);
  const cy = px(t.cy);
  for (let i = 1; i <= 6; i++) rect(ctx, cx - i * 3, cy - (i < 3 ? 1 : 0), 2, i < 3 ? 2 : 1, i < 3 ? PAL.cyan : PAL.glassDk);
  circle(ctx, cx, cy, Math.floor(time * 20) % 2 ? 3 : 2, PAL.cyan);
  rect(ctx, cx - 1, cy - 1, 2, 2, PAL.white);
}
