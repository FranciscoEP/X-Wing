import { RENDER } from '../config.js';

/**
 * Utilidades de dibujo pixel: todo se pinta en coordenadas enteras del búfer de 480×270, así
 * cada forma tiene bordes nítidos sin antialiasing. `px` convierte unidades de simulación a píxeles.
 */
export const px = (v) => Math.round(v * RENDER.SCALE);

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Círculo relleno, fila a fila, sin antialiasing. */
export function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const R = Math.max(0, Math.round(r));
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, R * R - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** Anillo de 1 px. `dash` > 0 deja huecos cada `dash` píxeles. */
export function ring(ctx, cx, cy, r, color, { dash = 0, rx = r, ry = r } = {}) {
  ctx.fillStyle = color;
  const steps = Math.max(8, Math.ceil(2 * Math.PI * Math.max(rx, ry)));
  let last = '';
  for (let i = 0; i < steps; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    const key = `${x},${y}`;
    if (key === last) continue;
    last = key;
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Línea de píxeles de grosor `size` desde (x0, y0) hasta (x1, y1). */
export function line(ctx, x0, y0, x1, y1, color, size = 1) {
  ctx.fillStyle = color;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), size, size);
  }
}

/** Texto con la tipografía pixel (8 px de cuadrícula). */
export function text(ctx, value, x, y, color, { align = 'center', size = 8 } = {}) {
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(value, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = color;
  ctx.fillText(value, Math.round(x), Math.round(y));
}
