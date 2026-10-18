import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CANVAS } from '../js/config.js';
import { SpriteCache, drawSprite } from '../js/render/art/SpriteCache.js';
import { Effects } from '../js/render/Effects.js';
import { MAX_WAVES, packWaves } from '../js/render/post/uniforms.js';
import { DT } from './helpers.js';

/** Canvas falso: registra las operaciones que importan para verificar los sprites. */
function fakeCanvas(width, height) {
  const ops = [];
  const ctx = new Proxy(
    { ops },
    {
      get: (target, prop) => (prop in target ? target[prop] : (...args) => ops.push([prop, ...args])),
      set: (target, prop, value) => {
        ops.push([`set:${String(prop)}`, value]);
        return true;
      },
    }
  );
  return { width, height, ops, getContext: () => ctx };
}

describe('render: Effects (ondas para el post-procesado)', () => {
  it('las ondas crecen, se debilitan y expiran', () => {
    const fx = new Effects();
    fx.wave(100, 100, { radius: 200, duration: 0.5 });
    fx.update(0.25);
    const [w] = fx.postState().waves;
    assert.ok(Math.abs(w.radius - 100) < 1e-6);
    assert.ok(Math.abs(w.strength - 0.5) < 1e-6);
    for (let t = 0; t < 0.3; t += DT) fx.update(DT);
    assert.equal(fx.postState().waves.length, 0);
  });

  it('no acumula más ondas de las que puede procesar', () => {
    const fx = new Effects();
    for (let i = 0; i < 50; i++) fx.wave(0, 0);
    assert.ok(fx.waves.length <= 8);
  });
});

describe('render: uniforms del shader', () => {
  it('convierte px a coordenadas UV con el eje Y invertido', () => {
    const { data, count } = packWaves([{ x: CANVAS.WIDTH / 2, y: 0, radius: CANVAS.HEIGHT / 2, strength: 1 }]);
    assert.equal(count, 1);
    assert.deepEqual([...data.slice(0, 4)], [0.5, 1, 0.5, 1]);
  });

  it('se queda con las ondas más fuertes si hay demasiadas', () => {
    const waves = Array.from({ length: 10 }, (_, i) => ({ x: 0, y: 0, radius: 0, strength: i / 10 }));
    const { data, count } = packWaves(waves);
    assert.equal(count, MAX_WAVES);
    assert.ok(Math.abs(data[3] - 0.9) < 1e-6, 'la primera es la más fuerte');
  });
});

describe('render: SpriteCache con los PNG del juego', () => {
  const images = { player: { width: 509, height: 490 }, tie: { width: 516, height: 417 } };

  it('prerenderiza jugador, enemigos y Vader a la escala de pantalla, con versión de destello', () => {
    const cache = new SpriteCache(images, 2, fakeCanvas);
    assert.ok(cache.player.canvas);
    for (const sprite of [cache.enemies.TIE_FIGHTER, cache.enemies.TIE_INTERCEPTOR, cache.vader]) {
      assert.ok(sprite.canvas && sprite.flash, 'tiene sprite y destello');
      assert.equal(sprite.canvas.width, Math.ceil((sprite.width + sprite.padding * 2) * 2));
    }
  });

  it('reescala con calidad alta y hornea el halo rojo solo donde corresponde', () => {
    const cache = new SpriteCache(images, 1, fakeCanvas);
    const ops = (sprite) => sprite.canvas.ops.map(([op]) => op);
    assert.ok(ops(cache.enemies.TIE_FIGHTER).includes('set:imageSmoothingQuality'));
    assert.ok(!ops(cache.enemies.TIE_FIGHTER).includes('set:shadowBlur'));
    assert.ok(ops(cache.enemies.TIE_INTERCEPTOR).includes('set:shadowBlur'));
    assert.ok(ops(cache.vader).includes('set:shadowBlur'));
  });

  it('si falta una imagen, dibuja un rectángulo en lugar de fallar', () => {
    const cache = new SpriteCache({}, 1, fakeCanvas);
    const target = fakeCanvas(10, 10);
    drawSprite(target.getContext(), cache.enemies.TIE_FIGHTER, 50, 50);
    assert.ok(target.ops.some(([op]) => op === 'fillRect'));
  });
});
