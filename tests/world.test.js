import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { COMBAT, DIFFICULTIES, PHASES, SCORE } from '../js/config.js';
import { centerOf } from '../js/core/utils.js';
import { OUTCOME } from '../js/sim/World.js';
import { emitted, godMode, makeWorld, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

/**
 * Piloto automático para pruebas de extremo a extremo: inmune, alinea la nave con el
 * objetivo más relevante (puerto de la Estrella de la Muerte, jefe o TIE más cercano) y dispara.
 */
function autopilot(world) {
  godMode(world);
  const { player, boss } = world;
  const port = world.trench?.port;
  let targetY = player.cy;
  if (port && !port.destroyed) {
    // Trinchera: alinearse con el puerto y lanzar un torpedo (los láseres no bastan)
    const dy = port.cy - player.cy;
    const torpedo = Math.abs(dy) < 12 && world.torpedoes.length === 0;
    return { moveY: Math.abs(dy) > 4 ? Math.sign(dy) : 0, moveX: player.x > 160 ? -1 : 0, shoot: true, torpedo };
  }
  if (boss?.vulnerable) {
    targetY = boss.targetPoint.y;
  } else {
    const ahead = world.enemies.filter((e) => !e.dead && e.x > player.x).sort((a, b) => a.x - b.x)[0];
    if (ahead) targetY = ahead.cy;
  }
  const dy = targetY - player.cy;
  return { moveY: Math.abs(dy) > 4 ? Math.sign(dy) : 0, moveX: player.x > 160 ? -1 : 0, shoot: true };
}

describe('World: partida completa', () => {
  for (const level of ['EASY', 'NORMAL', 'HARD']) {
    it(`en ${level} el juego se puede terminar: las 5 fases llevan a la victoria`, () => {
      const world = makeWorld({ difficulty: DIFFICULTIES[level], phase: 0 });
      const elapsed = run(world, 900, autopilot);
      assert.equal(world.outcome, OUTCOME.VICTORY, `no terminó en 900 s (fase ${world.phases.number}, jefe hp ${world.boss?.hp})`);
      assert.equal(emitted(world, 'phaseClear').length, PHASES.length);
      assert.ok(elapsed < 600, `demasiado larga: ${elapsed.toFixed(0)} s`);
    });
  }

  it('10 semillas distintas: ninguna partida se queda atascada', () => {
    for (let seed = 1; seed <= 10; seed++) {
      useSeed(seed);
      const world = makeWorld({ phase: 0 });
      run(world, 900, autopilot);
      assert.equal(world.outcome, OUTCOME.VICTORY, `semilla ${seed}: atascada en fase ${world.phases.number}`);
    }
  });

  it('regresión: un jugador que no hace nada termina perdiendo', () => {
    const world = makeWorld({ difficulty: DIFFICULTIES.HARD, phase: 0 });
    run(world, 600);
    assert.equal(world.outcome, OUTCOME.DEFEAT);
    assert.equal(emitted(world, 'playerDestroyed').length, DIFFICULTIES.HARD.lives);
  });

  it('la misma semilla produce exactamente la misma partida', () => {
    const play = () => {
      useSeed(99);
      const world = makeWorld({ phase: 0 });
      run(world, 60, autopilot);
      return [world.score, world.enemies.length, world.phases.number];
    };
    assert.deepEqual(play(), play());
  });
});

describe('World: vidas y reaparición', () => {
  it('tras ser destruido reaparece con una vida menos y escudo temporal', () => {
    const world = makeWorld({ phase: 0 });
    skipIntro(world);
    world.player.invulnerable = 0;
    world.damagePlayer(999);
    assert.ok(world.player.dead);
    run(world, COMBAT.RESPAWN_DELAY + 0.1);
    assert.ok(!world.player.dead);
    assert.equal(world.player.lives, DIFFICULTIES.NORMAL.lives - 1);
    assert.equal(world.player.canBeHit, false);
    assert.equal(emitted(world, 'playerRespawn').length, 1);
  });

  it('sin vidas la partida termina en derrota y deja de simular', () => {
    const world = makeWorld({ phase: 0 });
    world.player.lives = 1;
    world.player.invulnerable = 0;
    world.damagePlayer(999);
    run(world, COMBAT.RESPAWN_DELAY + 0.1);
    assert.equal(world.outcome, OUTCOME.DEFEAT);
    const frozen = world.player.x;
    world.update(1, { moveX: 1 });
    assert.equal(world.player.x, frozen);
  });
});

describe('World: oleadas y puntuación', () => {
  it('la oleada termina aunque algunos enemigos escapen', () => {
    const world = makeWorld({ phase: 0 });
    run(world, 120, godMode, { until: (w) => w.phases.number === 2 });
    assert.equal(world.phases.number, 2);
    const clear = emitted(world, 'phaseClear')[0].payload;
    assert.equal(clear.phase.name, PHASES[0].name);
  });

  it('superar una fase sin daño da el bonus completo', () => {
    const world = makeWorld({ phase: 0 });
    skipIntro(world);
    const before = world.score;
    world.phases.clear();
    assert.equal(world.score - before, SCORE.PHASE_CLEAR + SCORE.NO_DAMAGE);
  });
});

describe('World: estadísticas', () => {
  it('cuenta disparos, aciertos, derribos y daño recibido', () => {
    const world = makeWorld({ phase: 0 });
    run(world, 60, autopilot);
    const { stats } = world;
    assert.ok(stats.shotsFired > 0 && stats.shotsHit > 0 && stats.kills > 0);
    assert.ok(stats.shotsHit <= stats.shotsFired);
    assert.ok(world.accuracy > 0 && world.accuracy <= 1);
    assert.ok(stats.time > 59);
    world.player.invulnerable = 0;
    world.player.powerUps = {};
    const before = stats.damageTaken;
    world.damagePlayer(10);
    assert.equal(stats.damageTaken - before, 10);
  });
});
