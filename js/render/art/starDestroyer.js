import { PAL } from './palette.js';
import { seeded } from '../../core/random.js';

/**
 * Casco del Destructor Estelar en pixel art (vista cenital, proa a la izquierda), pintado una
 * sola vez a su tamaño en píxeles. Las partes (torretas, hangar, puente) se dibujan encima en
 * cada frame según su estado (render/bosses.js).
 */
export function paintStarDestroyerHull(w, h, createCanvas = defaultCreateCanvas) {
  const canvas = createCanvas(w + 2, h + 2);
  const ctx = canvas.getContext('2d');
  const cy = h / 2;
  // Fila a fila: el ancho crece de la proa (izquierda) a la popa
  for (let y = 0; y < h; y++) {
    const start = Math.round((Math.abs(y + 0.5 - cy) / cy) * w);
    const color = y < cy ? PAL.light : PAL.mid;
    ctx.fillStyle = color;
    ctx.fillRect(1 + start, 1 + y, w - start, 1);
    // Bordes superior e inferior más oscuros (sombra del casco)
    ctx.fillStyle = PAL.dark;
    ctx.fillRect(1 + start, 1 + y, 2, 1);
  }
  // Arista central y paneles transversales
  ctx.fillStyle = PAL.dark;
  ctx.fillRect(1 + Math.round(w * 0.05), 1 + Math.round(cy), w - Math.round(w * 0.05), 1);
  for (let i = 1; i < 8; i++) {
    const x = Math.round((w * i) / 8);
    const span = Math.round((x / w) * cy);
    for (let y = Math.round(cy) - span + 2; y < Math.round(cy) + span - 2; y += 2) ctx.fillRect(1 + x, 1 + y, 1, 1);
  }
  // Ventanas iluminadas (siempre las mismas)
  const rnd = seeded(7);
  for (let i = 0; i < 90; i++) {
    const u = 0.15 + rnd() * 0.8;
    const v = 0.5 + (rnd() - 0.5) * u * 0.9;
    ctx.fillStyle = rnd() < 0.7 ? PAL.yellow : PAL.glass;
    ctx.fillRect(1 + Math.round(u * w), 1 + Math.round(v * h), 1, 1);
  }
  // Toberas en la popa
  for (const v of [0.3, 0.5, 0.7]) {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(1 + w - 4, 1 + Math.round(v * h) - 4, 4, 8);
  }
  outline(ctx, canvas.width, canvas.height);
  return canvas;
}

function outline(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  ctx.fillStyle = PAL.outline;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
