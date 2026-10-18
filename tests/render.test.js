import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLAYER } from '../js/config.js';
import { PAL } from '../js/render/art/palette.js';
import { ENEMY_ART, TIE_ADVANCED, XWING } from '../js/render/art/pixelArt.js';
import { SpriteCache, drawSprite } from '../js/render/art/SpriteCache.js';
import { Effects } from '../js/render/Effects.js';
import { Particles } from '../js/render/Particles.js';
import { circle, px } from '../js/render/pixel.js';
import { DT } from './helpers.js';

/**
 * Canvas en memoria que rasteriza de verdad lo que el pixel art usa: fillRect con colores hex,
 * getImageData, drawImage 1:1 y 'source-atop'. Permite comprobar píxeles concretos en Node.
 */
class RasterCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    const self = this;
    this.ctx = {
      fillStyle: '#000000',
      globalCompositeOperation: 'source-over',
      fillRect(x, y, w, h) {
        const [r, g, b] = hex(this.fillStyle);
        for (let yy = Math.max(0, y); yy < Math.min(self.height, y + h); yy++) {
          for (let xx = Math.max(0, x); xx < Math.min(self.width, x + w); xx++) {
            const i = (yy * self.width + xx) * 4;
            if (this.globalCompositeOperation === 'source-atop' && self.data[i + 3] === 0) continue;
            self.data.set([r, g, b, 255], i);
          }
        }
      },
      getImageData: () => ({ data: self.data }),
      drawImage(src, x = 0, y = 0) {
        for (let yy = 0; yy < src.height; yy++) {
          for (let xx = 0; xx < src.width; xx++) {
            const s = (yy * src.width + xx) * 4;
            if (src.data[s + 3] === 0) continue;
            const tx = x + xx;
            const ty = y + yy;
            if (tx < 0 || ty < 0 || tx >= self.width || ty >= self.height) continue;
            self.data.set(src.data.subarray(s, s + 4), (ty * self.width + tx) * 4);
          }
        }
      },
    };
  }

  getContext() {
    return this.ctx;
  }

  pixel(x, y) {
    const i = (y * this.width + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return `#${[...this.data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  opaqueCount() {
    let n = 0;
    for (let i = 3; i < this.data.length; i += 4) if (this.data[i]) n++;
    return n;
  }
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const raster = (w, h) => new RasterCanvas(w, h);

describe('render pixel: utilidades', () => {
  it('px pasa unidades de simulación a píxeles enteros del búfer (480×270)', () => {
    assert.equal(px(960), 480);
    assert.equal(px(101), 51);
  });

  it('circle dibuja un círculo simétrico sin antialiasing', () => {
    const c = raster(11, 11);
    circle(c.getContext(), 5, 5, 4, '#ffffff');
    assert.equal(c.pixel(5, 1), '#ffffff');
    assert.equal(c.pixel(5, 9), '#ffffff');
    assert.equal(c.pixel(1, 5), '#ffffff');
    assert.equal(c.pixel(0, 0), null);
  });
});

describe('render pixel: sprites', () => {
  const cache = new SpriteCache(raster);

  it('cada sprite tiene su tamaño en píxeles más 1 px de contorno por lado', () => {
    assert.equal(cache.player.w, XWING.w + 2);
    assert.equal(cache.vader.h, TIE_ADVANCED.h + 2);
    for (const [type, art] of Object.entries(ENEMY_ART)) assert.equal(cache.enemies[type].w, art.w + 2);
  });

  it('las alas y cañones del X-Wing son simétricos arriba/abajo', () => {
    const { canvas, h, w } = cache.player;
    // Solo la franja de alas: el fuselaje tiene detalles asimétricos a propósito (sombra, cabina, R2)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < w; x++) assert.equal(canvas.pixel(x, y), canvas.pixel(x, h - 1 - y), `píxel ${x},${y}`);
    }
  });

  it('los cañones del X-Wing quedan donde nacen los láseres (PLAYER.CANNON_OFFSET)', () => {
    const { canvas, h } = cache.player;
    const cy = (h - 1) / 2;
    const cannonRow = cy - PLAYER.CANNON_OFFSET * 0.5;
    assert.ok(canvas.pixel(20, Math.round(cannonRow)), 'hay cañón en esa fila');
  });

  it('todo sprite queda rodeado por un contorno oscuro', () => {
    const { canvas, w } = cache.enemies.TIE_FIGHTER;
    const firstOpaque = [...Array(w).keys()].map((x) => canvas.pixel(x, 12)).find(Boolean);
    assert.equal(firstOpaque, PAL.outline);
  });

  it('la versión de destello es una silueta blanca del mismo tamaño', () => {
    const tie = cache.enemies.TIE_FIGHTER;
    assert.equal(tie.flash.opaqueCount(), tie.canvas.opaqueCount());
    assert.equal(tie.flash.pixel(13, 11), '#ffffff');
  });

  it('drawSprite centra el sprite en píxeles enteros', () => {
    const target = raster(40, 40);
    drawSprite(target.getContext(), cache.enemies.TIE_FIGHTER, 20.4, 20.6);
    assert.ok(target.opaqueCount() > 0);
  });
});

describe('render pixel: efectos', () => {
  it('la sacudida mueve la cámara en píxeles enteros y se apaga', () => {
    const fx = new Effects();
    fx.shake(10, 0.3);
    const { x, y } = fx.shakeOffset();
    assert.ok(Number.isInteger(x) && Number.isInteger(y));
    for (let t = 0; t < 0.4; t += DT) fx.update(DT);
    assert.deepEqual(fx.shakeOffset(), { x: 0, y: 0 });
  });

  it('las explosiones pixel, chispas y anillos caducan', () => {
    const particles = new Particles();
    for (let i = 0; i < 50; i++) {
      particles.explosion(100, 100);
      particles.shockwave(0, 0, 100);
      particles.text(0, 0, 'x');
    }
    for (let t = 0; t < 1.2; t += DT) particles.update(DT);
    assert.equal(particles.items.length + particles.blasts.length + particles.waves.length + particles.texts.length, 0);
  });
});
