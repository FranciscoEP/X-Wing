import { RENDER, TRENCH } from '../config.js';
import { PAL } from './art/palette.js';
import { drawSprite } from './art/SpriteCache.js';
import { circle, px, rect } from './pixel.js';

const ENTRY = 2; // s que tardan las paredes en cerrarse al entrar

/**
 * Trinchera de la Estrella de la Muerte en pixel art: suelo metálico entre dos paredes con
 * relieve, todo desplazándose a la velocidad de la carrera. Va en lugar del fondo espacial.
 */
export function drawTrenchBackground(ctx, trench) {
  const { WIDTH: W, HEIGHT: H } = RENDER;
  const close = Math.min(1, trench.t / ENTRY);
  const top = Math.round(px(trench.top) * close);
  const bottom = Math.round(H - (H - px(trench.bottom)) * close);
  const shift = Math.floor(px(trench.offset));

  // Suelo: placas oscuras con juntas que pasan
  rect(ctx, 0, top, W, bottom - top, '#161a24');
  for (let x = -(shift % 32); x < W; x += 32) rect(ctx, x, top, 1, bottom - top, PAL.ink);
  for (let y = top + 12; y < bottom; y += 24) rect(ctx, 0, y, W, 1, PAL.ink);
  // Luces de guía en el centro del pasillo
  const mid = Math.round((top + bottom) / 2);
  for (let x = -(shift % 48); x < W; x += 48) rect(ctx, x, mid, 6, 1, PAL.dark);

  drawWall(ctx, 0, top, shift, true);
  drawWall(ctx, bottom, H - bottom, shift, false);
}

/** Pared con relieve: bloques de distinta altura que se repiten cada 64 px. */
function drawWall(ctx, y, h, shift, isTop) {
  if (h <= 0) return;
  const W = RENDER.WIDTH;
  rect(ctx, 0, y, W, h, PAL.dark);
  for (let x = -(shift % 64); x < W; x += 64) {
    for (const [dx, bw, bh] of [[4, 20, 10], [30, 12, 18], [46, 14, 7]]) {
      const by = isTop ? y + h - bh : y;
      rect(ctx, x + dx, by, bw, bh, PAL.mid);
      rect(ctx, x + dx, isTop ? by + bh - 1 : by, bw, 1, PAL.light);
    }
  }
  // Borde del pasillo
  rect(ctx, 0, isTop ? y + h - 1 : y, W, 1, PAL.outline);
}

/** Vader detrás del jugador, asomando por el borde izquierdo. */
export function drawTrenchVader(ctx, vader, sprites, time) {
  if (!vader) return;
  const cx = px(vader.cx);
  const cy = px(vader.cy);
  drawSprite(ctx, sprites.vader, cx, cy);
  if (vader.charge > 0 && Math.floor(time * 24) % 2 === 0) {
    const x = cx + Math.floor(sprites.vader.w / 2) + 1;
    for (const dy of [-6, 6]) rect(ctx, x, cy + dy - 1, 3, 3, PAL.redHi);
  }
}

/** Puerto de escape: anillos concéntricos y una mira amarilla que parpadea. */
export function drawPort(ctx, port, time) {
  if (!port || port.destroyed) return;
  const cx = px(port.cx);
  const cy = px(port.cy);
  circle(ctx, cx, cy, 9, PAL.outline);
  circle(ctx, cx, cy, 8, PAL.mid);
  circle(ctx, cx, cy, 6, PAL.dark);
  circle(ctx, cx, cy, 4, PAL.ink);
  if (Math.floor(time * 4) % 2) return;
  const r = 13;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    rect(ctx, cx + sx * r - (sx > 0 ? 3 : 0), cy + sy * r, 4, 1, PAL.yellow);
    rect(ctx, cx + sx * r, cy + sy * r - (sy > 0 ? 3 : 0), 1, 4, PAL.yellow);
  }
}

export const TRENCH_ENTRY = ENTRY;
export const TRENCH_TOTAL = TRENCH.duration;
