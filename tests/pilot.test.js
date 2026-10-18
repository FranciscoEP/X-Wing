import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ExpertPilot } from '../js/sim/ai/ExpertPilot.js';
import { cruise } from '../js/sim/ai/movement.js';
import { playGame } from '../js/sim/balance.js';
import { DT, enemyBulletAt, makeWorld, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

function arena() {
  const world = makeWorld({ phase: 0 });
  skipIntro(world);
  world.enemies.length = 0;
  world.phases.spawned = world.phases.phase.count;
  world.player.invulnerable = 0;
  return world;
}

describe('piloto experto', () => {
  it('esquiva una bala que viene directo hacia él', () => {
    const world = arena();
    const bot = new ExpertPilot();
    world.spawnEnemyBullet(enemyBulletAt(world.player.cx + 200, world.player.cy));
    const hp = world.player.hp;
    run(world, 1, (w) => ({ ...bot.decide(w, DT), shoot: false }));
    assert.equal(world.player.hp, hp);
  });

  it('se alinea con el enemigo más cercano para dispararle', () => {
    const world = arena();
    const bot = new ExpertPilot();
    const e = world.spawnEnemy('TIE_FIGHTER', { x: 700, y: 60, movement: cruise({ baseY: 60, wobble: 0 }) });
    e.speed = 0;
    e.fireRate = 1e-4;
    run(world, 2, (w) => bot.decide(w, DT));
    assert.ok(Math.abs(world.player.cy - e.cy) < 30 || e.dead);
  });

  it('lanza un torpedo contra un grupo de cazas', () => {
    const world = arena();
    const bot = new ExpertPilot();
    for (const dy of [-30, 0, 30]) {
      const e = world.spawnEnemy('TIE_FIGHTER', { x: world.player.cx + 150, y: world.player.cy + dy - 22 });
      e.speed = 0;
    }
    assert.equal(bot.decide(world, DT).torpedo, true);
  });

  it('una partida con semilla fija da siempre el mismo resultado', () => {
    const a = playGame({ difficulty: 'NORMAL', seed: 5 });
    const b = playGame({ difficulty: 'NORMAL', seed: 5 });
    assert.deepEqual(a, b);
  });
});
