import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { Input } from '../js/core/Input.js';
import { MemoryBackend, Storage } from '../js/core/storage.js';
import { Game } from '../js/Game.js';
import { Particles } from '../js/render/Particles.js';
import { DT, FakeEventTarget, godMode, makeWorld, resetRandomSource, run, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

// Detectan crecimiento sin límite: la causa típica de fugas de memoria en un juego.
describe('memoria: nada crece sin límite', () => {
  it('las colecciones del mundo se mantienen acotadas durante una partida larga', () => {
    const world = makeWorld({ phase: 0 });
    let peak = 0;
    run(world, 300, (w) => {
      godMode(w);
      peak = Math.max(peak, w.enemies.length + w.enemyBullets.length + w.playerBullets.length + w.powerUps.length + w.torpedoes.length);
      return { shoot: true, moveY: Math.sin(w.phases.timer ?? 0) > 0 ? 1 : -1 };
    });
    assert.ok(peak < 200, `pico de ${peak} entidades vivas`);
  });

  it('las balas que salen de pantalla se eliminan', () => {
    const world = makeWorld({ phase: 0 });
    for (let i = 0; i < 50; i++) world.playerShoot(), (world.player.fireTimer = 0);
    assert.ok(world.playerBullets.length > 0);
    run(world, 3, godMode);
    assert.equal(world.playerBullets.length, 0);
  });

  it('las partículas, textos y ondas expiran', () => {
    const particles = new Particles();
    for (let i = 0; i < 500; i++) {
      particles.explosion(100, 100);
      particles.text(0, 0, 'x');
      particles.shockwave(0, 0, 100);
    }
    for (let t = 0; t < 2; t += DT) particles.update(DT);
    assert.equal(particles.items.length + particles.texts.length + particles.waves.length, 0);
  });

  it('cada partida usa un bus de eventos nuevo: las anteriores no quedan suscritas', () => {
    const keys = new FakeEventTarget();
    const attached = [];
    const renderer = { attach: (w) => attached.push(w.events), update() {}, render() {} };
    const audio = { muted: true, play() {}, startMusic() {}, stopMusic() {}, toggleMute() {} };
    const game = new Game({ input: new Input(keys), audio, renderer, storage: new Storage(new MemoryBackend()) });
    for (let i = 0; i < 3; i++) {
      game.startRun();
      game.toMenu();
    }
    assert.equal(new Set(attached).size, 3);
    assert.equal(game.world, null, 'el menú suelta la referencia a la partida anterior');
  });
});
