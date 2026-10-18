import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CANVAS, PLAYER } from '../js/config.js';
import { LOCK, LOCK_STATE, PAIR } from '../js/sim/bosses/TieAdvanced.js';
import { emitted, godMode, makeWorld, resetRandomSource, run, useSeed, waitBossReady } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

function vader(hpRatio = 1) {
  const world = makeWorld({ phase: 1 });
  waitBossReady(world);
  world.boss.hp = world.boss.maxHp * hpRatio;
  return world;
}

/** Aísla los disparos: sin embestidas ni escoltas. */
const isolate = (w) => {
  w.boss.chargeTimer = 99;
  w.enemies.length = 0;
};

describe('Vader etapa 1: pares rápidos', () => {
  it('avisa con los cañones y dispara dos láseres paralelos', () => {
    const world = vader();
    let charged = false;
    run(world, 3, (w) => (godMode(w), isolate(w), (charged ||= w.boss.cannonCharge > 0), {}), { until: (w) => w.enemyBullets.length > 0 });
    assert.ok(charged, 'hubo aviso antes del disparo');
    const [a, b] = world.enemyBullets;
    assert.equal(world.enemyBullets.length, 2);
    assert.ok(Math.abs(a.vx - b.vx) < 1e-9 && Math.abs(a.vy - b.vy) < 1e-9, 'misma dirección (paralelos)');
    assert.ok(Math.abs(Math.hypot(a.cx - b.cx, a.cy - b.cy) - PAIR.GAP * 2) < 1e-6);
  });

  it('en la etapa 1 no usa la mira', () => {
    const world = vader();
    run(world, 10, (w) => (godMode(w), isolate(w), {}));
    assert.equal(world.boss.lock.state, LOCK_STATE.IDLE);
    assert.equal(emitted(world, 'vaderLock').length, 0);
  });
});

describe('Vader etapa 3: la mira', () => {
  /** Lleva la mira hasta que se fija, con el jugador quieto. */
  function untilLocked(world) {
    run(world, 10, (w) => (isolate(w), (w.player.invulnerable = Infinity), {}), { until: (w) => w.boss.lock.state === LOCK_STATE.LOCKED });
    assert.equal(world.boss.lock.state, LOCK_STATE.LOCKED);
    world.enemyBullets.length = 0;
    world.player.invulnerable = 0;
  }

  it('te sigue con retraso antes de fijarse y lo anuncia', () => {
    const world = vader(0.2);
    run(world, 10, (w) => (isolate(w), godMode(w), {}), { until: (w) => w.boss.lock.state === LOCK_STATE.TRACKING });
    assert.equal(emitted(world, 'vaderLock').length, 1);
    const start = world.stats.time;
    world.player.y = 40;
    run(world, 0.2, (w) => (isolate(w), godMode(w), {}));
    const lock = world.boss.lock;
    assert.ok(Math.abs(lock.y - world.player.cy) > 5, 'no salta al instante');
    run(world, LOCK.TRACK, (w) => (isolate(w), godMode(w), {}), { until: (w) => w.boss.lock.state !== LOCK_STATE.TRACKING });
    assert.ok(world.stats.time - start >= LOCK.TRACK / world.difficulty.bossPace - 0.25);
  });

  it('si te quedas quieto, la ráfaga te alcanza', () => {
    const world = vader(0.2);
    untilLocked(world);
    run(world, 3, (w) => (isolate(w), {})); // fijado + ráfaga + vuelo hasta el jugador
    assert.ok(world.player.hp < PLAYER.MAX_HP);
  });

  it('si te mueves después de que se fija, la ráfaga falla', () => {
    const world = vader(0.2);
    untilLocked(world);
    const away = world.player.cy > CANVAS.HEIGHT / 2 ? -1 : 1;
    run(world, 3, (w) => (isolate(w), { moveY: away }));
    assert.equal(world.player.hp, PLAYER.MAX_HP);
  });

  it('mientras la mira trabaja, no dispara pares (un ataque peligroso a la vez)', () => {
    const world = vader(0.2);
    untilLocked(world);
    run(world, (LOCK.LOCKED / world.difficulty.bossPace) * 0.9, (w) => (isolate(w), godMode(w), {}));
    assert.equal(world.enemyBullets.length, 0);
  });
});
