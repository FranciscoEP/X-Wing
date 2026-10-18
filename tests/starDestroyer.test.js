import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PHASES, PLAYER } from '../js/config.js';
import { centerOf } from '../js/core/utils.js';
import { HIT } from '../js/sim/bosses/Boss.js';
import { ATTACK } from '../js/sim/bosses/StarDestroyer.js';
import { emitted, godMode, makeWorld, playerBulletAt, resetRandomSource, run, useSeed, waitBossReady } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

const PHASE = PHASES.findIndex((p) => p.boss === 'STAR_DESTROYER');

function destroyer() {
  const world = makeWorld({ phase: PHASE });
  waitBossReady(world);
  return world;
}

/** Destruye una parte a golpe de láser directo (desde su izquierda, a su altura). */
function destroyPart(world, id) {
  const { boss } = world;
  const part = boss.part(id);
  let guard = 0;
  while (!part.destroyed && guard++ < 500) {
    const c = centerOf(boss.rectOf(part));
    world.hitBoss(10, { x: c.x - 2, y: c.y - 2, width: 4, height: 4 });
  }
  assert.ok(part.destroyed, `no se pudo destruir ${id}`);
}

describe('Destructor Estelar por partes', () => {
  it('los láseres vuelan sobre el casco: solo las partes reciben impactos', () => {
    const world = destroyer();
    const { boss } = world;
    const fan = centerOf(boss.rectOf(boss.part('FAN')));
    assert.equal(boss.hitTest({ x: fan.x - 2, y: fan.y - 2, width: 4, height: 4 }), HIT.DAMAGE);
    // casco sin parte debajo: el disparo sigue de largo
    assert.equal(boss.hitTest({ x: boss.x + boss.width * 0.45, y: boss.cy + 20, width: 4, height: 4 }), null);
  });

  it('un láser horizontal llega a la torreta frontal (no lo frena el casco)', () => {
    const world = destroyer();
    world.boss.behave = () => {};
    const fan = centerOf(world.boss.rectOf(world.boss.part('FAN')));
    world.playerBullets.push(playerBulletAt(world.boss.x - 60, fan.y));
    const hp = world.boss.part('FAN').hp;
    run(world, 1, godMode, { until: (w) => w.playerBullets.length === 0 });
    assert.ok(world.boss.part('FAN').hp < hp);
  });

  it('el puente está blindado hasta que caen las tres torretas', () => {
    const world = destroyer();
    const { boss } = world;
    const bridge = centerOf(boss.rectOf(boss.part('BRIDGE')));
    const shot = { x: bridge.x - 2, y: bridge.y - 2, width: 4, height: 4 };
    assert.equal(boss.hitTest(shot), HIT.ARMOR);
    for (const id of ['FAN', 'BURST', 'BEAM']) destroyPart(world, id);
    assert.equal(emitted(world, 'bridgeExposed').length, 1);
    assert.equal(boss.hitTest(shot), HIT.DAMAGE);
  });

  it('cada parte destruida da puntos, se anuncia y apaga su ataque', () => {
    const world = destroyer();
    const score = world.score;
    destroyPart(world, 'HANGAR');
    assert.equal(emitted(world, 'bossPartDestroyed').length, 1);
    assert.ok(world.score > score);
    const before = world.enemies.length;
    run(world, ATTACK.HANGAR.every * 2, godMode);
    assert.equal(emitted(world, 'hangarLaunch').length, 0);
    assert.ok(world.enemies.length <= before);
  });

  it('destruir el puente vence al jefe', () => {
    const world = destroyer();
    for (const id of ['FAN', 'BURST', 'BEAM']) destroyPart(world, id);
    destroyPart(world, 'BRIDGE');
    assert.ok(world.boss.dying);
    run(world, 5, godMode, { until: (w) => !w.boss });
    assert.equal(world.boss, null);
  });

  it('el rayo de barrido avisa con su cono y daña a quien se queda dentro', () => {
    const world = destroyer();
    world.player.invulnerable = 0;
    const isolate = (w) => {
      w.enemyBullets.length = 0;
      w.enemies.length = 0;
      for (const id of ['FAN', 'BURST', 'HANGAR']) w.boss.part(id).timer = 99;
      return {};
    };
    run(world, 8, isolate, { until: (w) => emitted(w, 'beamCharge').length > 0 });
    assert.equal(world.boss.beam.phase, 'charge');
    run(world, ATTACK.BEAM.charge + ATTACK.BEAM.sweep + 0.1, isolate);
    assert.ok(world.player.hp < PLAYER.MAX_HP, 'el rayo no alcanzó a un jugador quieto');
  });

  it('el casco entero cuenta para chocar con él', () => {
    const world = destroyer();
    const { boss } = world;
    assert.ok(boss.collides({ x: boss.x + boss.width * 0.6, y: boss.cy - 5, width: 10, height: 10 }));
    assert.ok(!boss.collides({ x: boss.x + 10, y: boss.y + 5, width: 10, height: 10 }), 'esquina fuera del triángulo');
  });
});
