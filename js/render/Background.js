import { RENDER } from '../config.js';
import { seeded } from '../core/random.js';
import { PAL } from './art/palette.js';

const STAR_LAYERS = [
  { count: 60, speed: 6, color: PAL.dark },
  { count: 35, speed: 20, color: PAL.mid },
  { count: 14, speed: 55, color: PAL.white },
];

/**
 * Fondo pixel: la imagen del juego (cielo y superficie del planeta) reducida una sola vez al
 * búfer de 480×270, en mosaicos espejados que se desplazan, más estrellas de 1 px en paralaje.
 * Las estrellas usan su propio generador con semilla: no consumen el azar de la simulación.
 */
export class Background {
  constructor(image, createCanvas = defaultCreateCanvas) {
    this.tile = image ? prerender(image, createCanvas) : null;
    const rnd = seeded(1977);
    this.stars = STAR_LAYERS.flatMap((layer) =>
      Array.from({ length: layer.count }, () => ({ x: rnd() * RENDER.WIDTH, y: Math.floor(rnd() * RENDER.HEIGHT * 0.75), twinkle: rnd() * 6, ...layer }))
    );
    this.offset = 0;
    this.time = 0;
    this.speedMultiplier = 1;
  }

  update(dt) {
    this.time += dt;
    const k = this.speedMultiplier;
    this.offset += 4 * k * dt;
    for (const s of this.stars) {
      s.x -= s.speed * k * dt;
      if (s.x < 0) s.x += RENDER.WIDTH;
    }
  }

  draw(ctx) {
    const { WIDTH: W, HEIGHT: H } = RENDER;
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, W, H);
    if (this.tile) {
      const tw = this.tile.width;
      const shift = Math.floor(this.offset) % (tw * 2);
      for (let x = -shift; x < W; x += tw) {
        const mirrored = Math.round((x + shift) / tw) % 2 === 1;
        ctx.drawImage(mirrored ? this.tile.mirror : this.tile, x, 0);
      }
    }
    for (const s of this.stars) {
      const bright = s.speed > 40 && Math.sin(this.time * 3 + s.twinkle) > 0.6;
      ctx.fillStyle = bright ? PAL.yellow : s.color;
      ctx.fillRect(Math.floor(s.x), s.y, s.speed > 40 ? 2 : 1, 1);
    }
  }
}

/** Reduce la imagen al alto del búfer con calidad alta (una vez) y prepara su versión espejo. */
function prerender(image, createCanvas) {
  const h = RENDER.HEIGHT;
  const w = Math.round((image.width / image.height) * h);
  const tile = createCanvas(w, h);
  const ctx = tile.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);
  // Oscurece para que las naves destaquen
  ctx.fillStyle = 'rgba(4, 6, 15, 0.45)';
  ctx.fillRect(0, 0, w, h);
  const mirror = createCanvas(w, h);
  const mctx = mirror.getContext('2d');
  mctx.translate(w, 0);
  mctx.scale(-1, 1);
  mctx.drawImage(tile, 0, 0);
  tile.mirror = mirror;
  return tile;
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
