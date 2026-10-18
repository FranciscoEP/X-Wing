import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PHASES, TORPEDO } from '../js/config.js';
import { centerOf } from '../js/core/utils.js';
import { HIT } from '../js/sim/bosses/Boss.js';
import { Torpedo } from '../js/sim/entities/Torpedo.js';
import { PHASE_STATUS } from '../js/sim/PhaseManager.js';
import { emitted, godMode, makeWorld, playerBulletAt, resetRandomSource, run, useSeed, waitBossReady } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

const phaseOf = (boss) => PHASES.findIndex((p) => p.boss === boss);

/** Piloto automático: alinea el centro de la nave con el objetivo y dispara. */
const aimAt = (getY) => (world) => {
  godMode(world);
  const dy = getY(world) - world.player.cy;
  return { moveY: Math.abs(dy) > 4 ? Math.sign(dy) : 0, shoot: true };
};

describe('jefes: comunes', () => {
  for (const type of ['TIE_ADVANCED', 'STAR_DESTROYER']) {
    it(`${type}: es invulnerable mientras entra y vulnerable después`, () => {
      const world = makeWorld({ phase: phaseOf(type) });
      run(world, 10, {}, { until: (w) => w.boss });
      assert.equal(world.boss.vulnerable, false);
      assert.equal(world.boss.takeDamage(999), false);
      waitBossReady(world);
      assert.equal(world.boss.vulnerable, true);
    });
  }

  it('al destruir al jefe se supera la fase y se recupera vida', () => {
    const world = makeWorld({ phase: phaseOf('TIE_ADVANCED') });
    waitBossReady(world);
    world.player.hp = 10;
    world.hitBoss(world.boss.hp);
    assert.equal(emitted(world, 'bossDying').length, 1);
    run(world, 5, godMode, { until: (w) => !w.boss });
    assert.equal(emitted(world, 'bossDestroyed').length, 1);
    assert.equal(world.phases.status, PHASE_STATUS.CLEAR);
    assert.ok(world.player.hp > 10);
  });
});

describe('TIE Advanced', () => {
  it('recibe daño de los láseres y dispara al jugador', () => {
    const world = makeWorld({ phase: phaseOf('TIE_ADVANCED') });
    waitBossReady(world);
    let shots = 0;
    const spawn = world.spawnEnemyBullet.bind(world);
    world.spawnEnemyBullet = (b) => {
      shots++;
      spawn(b);
    };
    run(world, 6, aimAt((w) => w.boss.cy));
    assert.ok(world.boss.hp < world.boss.maxHp);
    assert.ok(shots > 0, 'Vader no disparó');
  });
});
