import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PHASE_TYPE, PHASES, PLAYER, TRENCH, WEAPONS } from '../js/config.js';
import { Torpedo } from '../js/sim/entities/Torpedo.js';
import { OUTCOME } from '../js/sim/World.js';
import { buildEndModel, buildHudModel } from '../js/ui/viewModel.js';
import { emitted, godMode, makeWorld, playerBulletAt, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

const PHASE = PHASES.findIndex((p) => p.type === PHASE_TYPE.TRENCH);

function trench() {
  const world = makeWorld({ phase: PHASE });
  world.player.hp = 30;
  world.player.torpedoCount = 0;
  skipIntro(world);
  return world;
}

/** Avanza hasta `t` segundos de trinchera con el jugador inmune. */
const until = (world, t) => run(world, t + 1, godMode, { until: (w) => w.trench.t >= t });

describe('trinchera: entrada', () => {
  it('es la fase final y sustituye a la Estrella de la Muerte', () => {
    assert.equal(PHASE, PHASES.length - 1);
    assert.ok(!PHASES.some((p) => p.boss === 'DEATH_STAR'));
  });

  it('el respiro de entrada repara el escudo y da torpedos', () => {
    const world = trench();
    assert.equal(world.player.hp, PLAYER.MAX_HP);
    assert.equal(world.player.torpedoCount, TRENCH.torpedoRefill);
    assert.equal(emitted(world, 'trenchStart').length, 1);
  });

  it('el jugador queda dentro del pasillo y por delante de Vader', () => {
    const world = trench();
    run(world, 2, (w) => (godMode(w), { moveX: -1, moveY: -1 }));
    assert.ok(world.player.y >= TRENCH.top && world.player.x >= TRENCH.minPlayerX);
    run(world, 2, (w) => (godMode(w), { moveY: 1 }));
    assert.ok(world.player.y + world.player.height <= TRENCH.bottom);
  });

  it('durante la entrada no hay torretas; después sí', () => {
    const world = trench();
    until(world, TRENCH.calm - 0.5);
    assert.equal(world.enemies.filter((e) => e.type === 'TRENCH_TURRET').length, 0);
    until(world, TRENCH.calm + 4);
    assert.ok(world.enemies.some((e) => e.type === 'TRENCH_TURRET'));
  });
});

describe('trinchera: amenazas', () => {
  it('las torretas avisan y disparan un trío de rayos', () => {
    const world = trench();
    let charged = false;
    run(world, TRENCH.calm + 8, (w) => {
      godMode(w);
      charged ||= w.enemies.some((e) => e.weapon.kind === 'TRIO' && e.weapon.charge > 0);
      return {};
    }, { until: (w) => w.enemyBullets.length >= WEAPONS.TRIO.count });
    assert.ok(charged, 'hubo aviso antes del disparo');
    assert.ok(world.enemyBullets.length >= WEAPONS.TRIO.count);
  });

  it('Vader aparece detrás y dispara hacia delante', () => {
    const world = trench();
    until(world, TRENCH.vaderAt + 4);
    assert.equal(emitted(world, 'trenchVader').length, 1);
    assert.ok(world.trench.vader);
    world.enemies.length = 0;
    world.enemyBullets.length = 0;
    run(world, 4, (w) => (godMode(w), (w.enemies.length = 0), {}), { until: (w) => w.enemyBullets.some((b) => b.vx > 0) });
    assert.ok(world.enemyBullets.some((b) => b.vx > 0), 'disparos hacia la derecha (desde atrás)');
  });
});

describe('trinchera: el puerto de escape', () => {
  function withPort() {
    const world = trench();
    until(world, TRENCH.portAt + 4);
    world.enemies.length = 0;
    world.enemyBullets.length = 0;
    return world;
  }

  it('aparece a tiempo y se detiene al final del pasillo', () => {
    const world = withPort();
    const { port } = world.trench;
    assert.ok(port && port.x <= port.stopX + 1);
    assert.equal(emitted(world, 'portInRange').length, 1);
  });

  it('los láseres rebotan: no lo destruyen', () => {
    const world = withPort();
    const { port } = world.trench;
    world.playerBullets.push(playerBulletAt(port.x - 30, port.cy));
    run(world, 0.5, godMode);
    assert.equal(port.destroyed, false);
    assert.equal(emitted(world, 'portDeflect').length, 1);
  });

  it('un torpedo lo destruye y gana la partida', () => {
    const world = withPort();
    const { port } = world.trench;
    world.torpedoes.push(new Torpedo(port.x - 80, port.cy));
    run(world, 1, godMode, { until: () => port.destroyed });
    assert.ok(port.destroyed);
    assert.equal(emitted(world, 'portDestroyed').length, 1);
    run(world, 10, godMode);
    assert.equal(world.outcome, OUTCOME.VICTORY);
  });

  it('si se acaba la cuenta, el superláser dispara y se pierde', () => {
    const world = trench();
    run(world, TRENCH.duration + 2, godMode);
    assert.equal(world.outcome, OUTCOME.DEFEAT);
    assert.equal(world.outcomeReason, 'superlaser');
    assert.match(buildEndModel(world, { victory: false, highScore: 0, newRecord: false }).subtitle, /superláser|disparó/);
  });

  it('el HUD muestra la cuenta regresiva y se pone urgente al final', () => {
    const world = trench();
    assert.equal(buildHudModel(world).countdown.time, '1:00');
    until(world, TRENCH.duration - 5);
    assert.equal(buildHudModel(world).countdown.urgent, true);
  });
});
