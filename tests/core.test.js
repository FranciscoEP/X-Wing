import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { EventBus } from '../js/core/EventBus.js';
import { Input } from '../js/core/Input.js';
import { random, resetRandomSource, seeded, setRandomSource } from '../js/core/random.js';
import { MemoryBackend, Storage } from '../js/core/storage.js';
import { AudioManager } from '../js/core/Audio.js';
import { clamp, overlaps, prune, shrink, weightedPick } from '../js/core/utils.js';
import { FakeEventTarget } from './helpers.js';

afterEach(resetRandomSource);

describe('utils', () => {
  it('clamp limita al rango', () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
  });

  it('overlaps detecta solapamiento y no cuenta bordes que solo se tocan', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    assert.ok(overlaps(a, { x: 5, y: 5, width: 10, height: 10 }));
    assert.ok(!overlaps(a, { x: 10, y: 0, width: 10, height: 10 }));
  });

  it('regresión: un láser fino (3 px) que atraviesa el núcleo del objetivo sí colisiona', () => {
    const laser = { x: 30, y: 33, width: 22, height: 3 };
    const ship = { x: 0, y: 0, width: 72, height: 68 };
    assert.ok(overlaps(laser, shrink(ship, 16)));
  });

  it('shrink reduce por cada lado', () => {
    assert.deepEqual(shrink({ x: 0, y: 0, width: 50, height: 40 }, 5), { x: 5, y: 5, width: 40, height: 30 });
  });

  it('weightedPick respeta los pesos', () => {
    const table = { A: { weight: 1 }, B: { weight: 3 } };
    setRandomSource(() => 0.1);
    assert.equal(weightedPick(table), 'A');
    setRandomSource(() => 0.9);
    assert.equal(weightedPick(table), 'B');
  });

  it('prune elimina en sitio', () => {
    const list = [1, 2, 3, 4];
    prune(list, (n) => n % 2 === 0);
    assert.deepEqual(list, [2, 4]);
  });
});

describe('random', () => {
  it('seeded es determinista', () => {
    const a = seeded(7);
    const b = seeded(7);
    for (let i = 0; i < 5; i++) assert.equal(a(), b());
  });

  it('setRandomSource reemplaza la fuente global', () => {
    setRandomSource(() => 0.5);
    assert.equal(random(), 0.5);
  });
});

describe('EventBus', () => {
  it('entrega el payload y permite desuscribirse', () => {
    const bus = new EventBus();
    const got = [];
    const off = bus.on('x', (p) => got.push(p));
    bus.emit('x', 1);
    off();
    bus.emit('x', 2);
    assert.deepEqual(got, [1]);
  });
});

describe('Input', () => {
  it('isDown sigue la tecla mantenida y consume() solo devuelve true una vez', () => {
    const target = new FakeEventTarget();
    const input = new Input(target);
    target.key('keydown', 'KeyW');
    assert.ok(input.isDown(['KeyW']));
    assert.ok(input.consume(['KeyW']));
    assert.ok(!input.consume(['KeyW']));
    target.key('keyup', 'KeyW');
    assert.ok(!input.isDown(['KeyW']));
  });

  it('readControls traduce teclas a ejes y acciones', () => {
    const target = new FakeEventTarget();
    const input = new Input(target);
    target.key('keydown', 'ArrowRight');
    target.key('keydown', 'KeyW');
    target.key('keydown', 'Space');
    target.key('keydown', 'KeyK');
    assert.deepEqual(input.readControls(), { moveX: 1, moveY: -1, shoot: true, torpedo: true });
    assert.equal(input.readControls().torpedo, false, 'el torpedo se dispara una vez por pulsación');
  });

  it('al perder el foco suelta todas las teclas', () => {
    const target = new FakeEventTarget();
    const input = new Input(target);
    target.key('keydown', 'KeyD');
    target.dispatchEvent(new Event('blur'));
    assert.ok(!input.isDown(['KeyD']));
  });
});

describe('Storage', () => {
  it('persiste récord y silencio', () => {
    const storage = new Storage(new MemoryBackend());
    assert.equal(storage.highScore, 0);
    storage.highScore = 1234;
    storage.muted = true;
    assert.equal(storage.highScore, 1234);
    assert.equal(storage.muted, true);
  });

  it('no rompe si el backend lanza excepciones', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const storage = new Storage(broken);
    storage.highScore = 10;
    assert.equal(storage.highScore, 0);
  });
});

describe('AudioManager', () => {
  const fakeAudio = () => {
    const created = [];
    const createAudio = (src) => {
      const a = { src, played: 0, paused: 0, play() { this.played++; return Promise.resolve(); }, pause() { this.paused++; } };
      created.push(a);
      return a;
    };
    return { created, createAudio };
  };

  it('en silencio no reproduce efectos', () => {
    const { created, createAudio } = fakeAudio();
    const audio = new AudioManager({ shoot: 's.mp3', music: 'm.mp3' }, { storage: new Storage(new MemoryBackend()), forceMute: true, createAudio });
    audio.play('shoot');
    assert.equal(created.length, 1, 'solo se creó la música');
  });

  it('toggleMute persiste y notifica', () => {
    const { createAudio } = fakeAudio();
    const storage = new Storage(new MemoryBackend());
    const audio = new AudioManager({ music: 'm.mp3' }, { storage, createAudio });
    const seen = [];
    audio.onChange((m) => seen.push(m));
    audio.toggleMute(false);
    assert.deepEqual(seen, [false, true]);
    assert.equal(storage.muted, true);
  });

  it('reutiliza un pool fijo de voces en lugar de crear un Audio por disparo', () => {
    const { created, createAudio } = fakeAudio();
    let t = 0;
    const audio = new AudioManager({ shoot: 's.mp3', music: 'm.mp3' }, { storage: new Storage(new MemoryBackend()), createAudio, now: () => t });
    for (let i = 0; i < 100; i++) {
      t += 1;
      audio.play('shoot');
    }
    assert.equal(created.length, 1 + 4, 'música + 4 voces');
    assert.equal(created.slice(1).reduce((n, a) => n + a.played, 0), 100);
  });

  it('respeta el intervalo mínimo entre efectos', () => {
    const { created, createAudio } = fakeAudio();
    let t = 0;
    const audio = new AudioManager({ shoot: 's.mp3', music: 'm.mp3' }, { storage: new Storage(new MemoryBackend()), createAudio, now: () => t });
    audio.play('shoot', { minGap: 0.1 });
    audio.play('shoot', { minGap: 0.1 });
    t = 0.2;
    audio.play('shoot', { minGap: 0.1 });
    assert.equal(created.length, 3); // música + 2 disparos
  });
});
