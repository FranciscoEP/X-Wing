import { MINE, POWERUP_ITEM, RENDER, WEAPONS } from '../config.js';
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

export function drawEnemy(ctx, enemy, sprites, time) {
  const warning = enemy.movement.warning;
  if (warning) return drawPassWarning(ctx, warning, time);
  const cx = px(enemy.cx);
  const cy = px(enemy.cy);
  const key = enemy.type === 'TRENCH_TURRET' && !enemy.onTop ? 'TRENCH_TURRET_BOTTOM' : enemy.type;
  const sprite = sprites.enemies[key];
  drawSprite(ctx, sprite, cx, cy, { flash: enemy.hitFlash > 0 });
  // Aviso de la torreta de trinchera: el cañón se pone al rojo antes del trío
  if (enemy.weapon.kind === 'TRIO' && enemy.weapon.charge > 0) {
    const r = 1 + Math.round(enemy.weapon.charge * 3);
    circle(ctx, cx - 10, cy, r, Math.floor(time * 20) % 2 ? PAL.orange : PAL.yellow);
    return;
  }
  // Aviso del TIE Fighter: sus cañones brillan antes del disparo doble
  if (enemy.weapon.kind === 'TWIN' && enemy.weapon.charge > 0 && Math.floor(time * 20) % 2 === 0) {
    const gap = px(WEAPONS.TWIN.gap);
    const x = cx - Math.floor(sprite.w / 2) - 1;
    for (const dy of [-gap, gap]) {
      rect(ctx, x - 1, cy + dy - 1, 3, 3, PAL.yellow);
      rect(ctx, x, cy + dy, 1, 1, PAL.white);
    }
  }
}

/** Aviso de pasada del Interceptor: línea roja discontinua por la diagonal que va a cruzar. */
function drawPassWarning(ctx, w, time) {
  // Parpadea cada vez más rápido según se acerca la pasada
  const rate = 6 + w.progress * 14;
  if (Math.floor(time * rate) % 2) return;
  const x0 = px(w.x);
  const y0 = px(w.y);
  const len = RENDER.WIDTH + RENDER.HEIGHT;
  for (let i = 0; i < len; i += 6) {
    rect(ctx, x0 + w.dx * i, y0 + w.dy * i, 3, 1, PAL.red);
  }
  // Flecha en el borde de la pantalla por donde entrará
  const ex = Math.max(2, Math.min(RENDER.WIDTH - 6, x0 + w.dx * (w.dy > 0 ? -y0 / w.dy : (RENDER.HEIGHT - y0) / -w.dy)));
  const ey = w.dy > 0 ? 2 : RENDER.HEIGHT - 6;
  rect(ctx, ex, ey, 4, 4, PAL.redHi);
}

/** Mina: esfera con púas; su luz parpadea cada vez más rápido hasta estallar. */
export function drawMine(ctx, mine, time) {
  const cx = px(mine.cx);
  const cy = px(mine.cy);
  const r = Math.round(px(MINE.size) / 2);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) rect(ctx, cx + dx * (r + 1), cy + dy * (r + 1), 1, 1, PAL.mid);
  circle(ctx, cx, cy, r, PAL.outline);
  circle(ctx, cx, cy, r - 1, PAL.dark);
  const period = Math.max(0.06, mine.timeLeft / 6);
  const on = Math.floor(time / period) % 2 === 0;
  rect(ctx, cx - 1, cy - 1, 2, 2, on ? (mine.fuse !== null ? PAL.white : PAL.red) : PAL.ink);
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
