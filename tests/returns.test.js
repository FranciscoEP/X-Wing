import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { DIFFICULTIES, RETURN } from '../js/config.js';
import { cruise } from '../js/sim/ai/movement.js';
import { emitted, godMode, makeWorld, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

function arena(difficulty = DIFFICULTIES.NORMAL) {
  const world = makeWorld({ difficulty, phase: 0 });
  skipIntro(world);
  world.enemies.length = 0;
  world.squadrons.length = 0;
  world.phases.spawned = world.phases.phase.count;
  return world;
}

/** Caza que cruza rápido la pantalla en línea recta, lejos del jugador. */
function crosser(world, type = 'TIE_FIGHTER') {
  const e = world.spawnEnemy(type, { x: 700, y: 60, movement: cruise({ baseY: 60, wobble: 0 }), fromWave: true });
  e.speed = 900;
  e.weapon = { kind: 'NONE', charge: 0, update() {} };
  return e;
}

describe('cazas que vuelven', () => {
  it('un TIE que sale sin ser derribado da la vuelta y vuelve a entrar por la derecha', () => {
    const world = arena();
    const e = crosser(world);
    run(world, 3, godMode, { until: () => emitted(world, 'enemyReturn').length > 0 });
    assert.equal(emitted(world, 'enemyReturn').length, 1);
    assert.ok(!e.dead, 'no se elimina');
    run(world, RETURN.delay + 0.2, godMode, { until: () => emitted(world, 'enemyReentry').length > 0 });
    assert.equal(emitted(world, 'enemyReentry').length, 1);
    assert.ok(e.x > 940, 'reaparece por la derecha');
  });

  it('avisa con una flecha en el borde antes de reaparecer', () => {
    const world = arena();
    const e = crosser(world);
    run(world, 3, godMode, { until: () => e.returning > 0 });
    assert.equal(e.returnWarning, null, 'al principio de la vuelta no hay aviso');
    run(world, RETURN.delay - RETURN.warn + 0.1, godMode);
    assert.ok(e.returnWarning, 'en el último tramo sí');
  });

  it('las vueltas tienen límite: al agotarlas escapa y la oleada lo cuenta', () => {
    const world = arena(DIFFICULTIES.HARD);
    const e = crosser(world);
    // la reentrada usa la velocidad normal: se acelera cada vez que vuelve
    world.events.on('enemyReentry', ({ enemy }) => (enemy.speed = 900));
    const resolved = world.phases.resolved;
    run(world, 20, godMode, { until: () => e.dead });
    assert.equal(emitted(world, 'enemyReturn').length, DIFFICULTIES.HARD.enemyReturns);
    assert.ok(e.dead && e.escaped);
    assert.equal(world.phases.resolved, resolved + 1);
  });

  it('en Fácil no vuelven y el Bomber nunca vuelve', () => {
    const easy = arena(DIFFICULTIES.EASY);
    const a = crosser(easy);
    run(easy, 3, godMode, { until: () => a.dead });
    assert.ok(a.escaped);
    const hard = arena(DIFFICULTIES.HARD);
    const b = crosser(hard, 'TIE_BOMBER');
    run(hard, 3, godMode, { until: () => b.dead });
    assert.ok(b.escaped);
    assert.equal(emitted(hard, 'enemyReturn').length, 0);
  });

  it('el Interceptor vuelve con una pasada nueva en diagonal (y su aviso)', () => {
    const world = arena();
    const e = crosser(world, 'TIE_INTERCEPTOR');
    run(world, 3 + RETURN.delay, godMode, { until: () => emitted(world, 'enemyReentry').length > 0 });
    assert.equal(e.movement.name, 'slash');
    world.update(1 / 60, {});
    assert.ok(e.movement.warning, 'marca la diagonal antes de cruzar');
  });

  it('mientras da la vuelta no dispara ni se le puede alcanzar', () => {
    const world = arena();
    const e = crosser(world);
    run(world, 3, godMode, { until: () => e.returning > 0 });
    assert.ok(!e.canFire(world));
    assert.ok(e.x > 960);
  });
});
