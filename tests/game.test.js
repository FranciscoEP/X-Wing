import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { DIFFICULTIES } from '../js/config.js';
import { Input } from '../js/core/Input.js';
import { MemoryBackend, Storage } from '../js/core/storage.js';
import { Game } from '../js/Game.js';
import { SCENE } from '../js/render/Renderer.js';
import { OUTCOME } from '../js/sim/World.js';
import { buildHudModel } from '../js/ui/HUD.js';
import { DT, FakeEventTarget, resetRandomSource, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

function makeGame() {
  const keys = new FakeEventTarget();
  const audio = {
    muted: false,
    calls: [],
    play(name) { this.calls.push(['play', name]); },
    startMusic() { this.calls.push(['startMusic']); },
    stopMusic() { this.calls.push(['stopMusic']); },
    toggleMute() { this.muted = !this.muted; },
  };
  const storage = new Storage(new MemoryBackend());
  const game = new Game({ input: new Input(keys), audio, storage, renderer: null });
  const press = (code) => {
    keys.key('keydown', code);
    game.step(DT);
    keys.key('keyup', code);
  };
  return { game, press, audio, storage };
}

describe('Game: máquina de estados', () => {
  it('menú → elegir dificultad → jugar', () => {
    const { game, press, audio } = makeGame();
    assert.equal(game.state, SCENE.MENU);
    press('ArrowDown');
    assert.equal(game.difficultyKey, 'HARD');
    press('ArrowDown');
    assert.equal(game.difficultyKey, 'EASY', 'la lista da la vuelta');
    press('Enter');
    assert.equal(game.state, SCENE.PLAYING);
    assert.equal(game.world.player.lives, DIFFICULTIES.EASY.lives);
    assert.deepEqual(audio.calls.at(-1), ['startMusic']);
  });

  it('en pausa la simulación no avanza; Q vuelve al menú', () => {
    const { game, press } = makeGame();
    press('Enter');
    press('KeyP');
    assert.equal(game.state, SCENE.PAUSED);
    const timer = game.world.phases.timer;
    for (let i = 0; i < 60; i++) game.step(DT);
    assert.equal(game.world.phases.timer, timer);
    press('KeyP');
    assert.equal(game.state, SCENE.PLAYING);
    press('Escape');
    press('KeyQ');
    assert.equal(game.state, SCENE.MENU);
    assert.equal(game.world, null);
  });

  it('pause() externo (pestaña oculta) solo pausa si se está jugando', () => {
    const { game, press } = makeGame();
    game.pause();
    assert.equal(game.state, SCENE.MENU);
    press('Enter');
    game.pause();
    assert.equal(game.state, SCENE.PAUSED);
  });

  it('al perder guarda el récord y Enter vuelve al menú', () => {
    const { game, press, storage } = makeGame();
    press('Enter');
    game.world.score = 4321;
    game.world.finish(OUTCOME.DEFEAT);
    assert.equal(game.state, SCENE.GAME_OVER);
    assert.equal(storage.highScore, 4321);
    assert.ok(game.newRecord);
    press('Enter');
    assert.equal(game.state, SCENE.MENU);
  });

  it('una victoria lleva a la pantalla de victoria', () => {
    const { game, press } = makeGame();
    press('Enter');
    game.world.finish(OUTCOME.VICTORY);
    assert.equal(game.state, SCENE.VICTORY);
  });

  it('M alterna el sonido en cualquier estado', () => {
    const { game, press, audio } = makeGame();
    press('KeyM');
    assert.equal(audio.muted, true);
    press('Enter');
    press('KeyM');
    assert.equal(audio.muted, false);
  });

  it('disparar reproduce el sonido de disparo', () => {
    const { game, press, audio } = makeGame();
    press('Enter');
    game.world.phases.update(10); // saltar cartel
    press('Space');
    assert.ok(audio.calls.some(([c, n]) => c === 'play' && n === 'shoot'));
  });
});

describe('HUD', () => {
  it('buildHudModel resume el estado sin exponer el mundo', () => {
    const { game, press } = makeGame();
    press('Enter');
    const model = buildHudModel(game.world, { highScore: 10, muted: true });
    assert.equal(model.hpRatio, 1);
    assert.equal(model.lives, DIFFICULTIES.NORMAL.lives);
    assert.equal(model.phase.number, 1);
    assert.equal(model.boss, null);
    assert.equal(model.muted, true);
    assert.deepEqual(model.powerUps, []);
  });
});
