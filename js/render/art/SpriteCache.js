import { PAL } from './palette.js';
import { ENEMY_ART, TIE_ADVANCED, XWING } from './pixelArt.js';

const OUTLINE = 1; // px de contorno alrededor de cada sprite

/**
 * Pinta cada nave de pixelArt.js una sola vez en un canvas propio, le añade el contorno
 * oscuro de 1 px y una versión `flash` (silueta blanca) para los impactos.
 */
export class SpriteCache {
  constructor(createCanvas = defaultCreateCanvas) {
    this.createCanvas = createCanvas;
    this.player = this.build(XWING);
    this.enemies = Object.fromEntries(Object.entries(ENEMY_ART).map(([type, art]) => [type, this.withFlash(this.build(art))]));
    this.vader = this.withFlash(this.build(TIE_ADVANCED));
    // La torreta del suelo es la de la pared superior reflejada en vertical
    this.enemies.TRENCH_TURRET_BOTTOM = this.withFlash(this.flipY(this.enemies.TRENCH_TURRET));
  }

  flipY(sprite) {
    const canvas = this.createCanvas(sprite.w, sprite.h);
    const ctx = canvas.getContext('2d');
    ctx.translate?.(0, sprite.h);
    ctx.scale?.(1, -1);
    ctx.drawImage(sprite.canvas, 0, 0);
    return { canvas, w: sprite.w, h: sprite.h };
  }

  build(art) {
    const w = art.w + OUTLINE * 2;
    const h = art.h + OUTLINE * 2;
    const canvas = this.createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    art.paint(painter(ctx, OUTLINE, OUTLINE));
    addOutline(ctx, w, h);
    return { canvas, w, h };
  }

  withFlash(sprite) {
    const flash = this.createCanvas(sprite.w, sprite.h);
    const ctx = flash.getContext('2d');
    ctx.drawImage(sprite.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sprite.w, sprite.h);
    return { ...sprite, flash };
  }
}

/** Primitivas enteras con desplazamiento y reflejos (ver pixelArt.js). */
export function painter(ctx, ox = 0, oy = 0) {
  let fx = null; // eje de reflejo horizontal activo
  let fy = null; // eje de reflejo vertical activo
  const put = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(ox + x), Math.round(oy + y), w, h);
  };
  const r = (x, y, w, h, color) => {
    put(x, y, w, h, color);
    if (fx !== null) put(2 * fx - x - w + 1, y, w, h, color);
    if (fy !== null) put(x, 2 * fy - y - h + 1, w, h, color);
  };
  const p = {
    r,
    c(cx, cy, rad, color) {
      for (let dy = -rad; dy <= rad; dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, rad * rad - dy * dy)));
        r(cx - half, cy + dy, half * 2 + 1, 1, color);
      }
    },
    line(x0, y0, x1, y1, color, size = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) r(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), size, 1, color);
    },
    mirrorX(axis, draw) {
      fx = axis;
      draw();
      fx = null;
    },
    mirrorY(axis, draw) {
      fy = axis;
      draw();
      fy = null;
    },
  };
  return p;
}

/** Contorno de 1 px: cada píxel transparente junto a uno opaco se pinta del color de contorno. */
function addOutline(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  const edge = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) edge.push([x, y]);
    }
  }
  ctx.fillStyle = PAL.outline;
  for (const [x, y] of edge) ctx.fillRect(x, y, 1, 1);
}

/** Dibuja un sprite centrado en (cx, cy) píxeles del búfer, alineado a la cuadrícula. */
export function drawSprite(ctx, sprite, cx, cy, { flash = false } = {}) {
  ctx.drawImage(flash && sprite.flash ? sprite.flash : sprite.canvas, Math.round(cx - sprite.w / 2), Math.round(cy - sprite.h / 2));
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** PNG (data URL) de un sprite para el HTML (vidas del HUD). */
export function spriteToDataUrl(sprite) {
  return sprite.canvas.toDataURL('image/png');
}
