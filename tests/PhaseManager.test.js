import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHASE_BANNER_TIME, PHASES } from '../js/config.js';
import { PHASE_STATUS, PhaseManager } from '../js/sim/PhaseManager.js';

const make = () => {
  const calls = [];
  const pm = new PhaseManager({
    onPhaseStart: (p) => calls.push(['start', p.name]),
    onPhaseClear: (p, flawless) => calls.push(['clear', p.name, flawless]),
    onVictory: () => calls.push(['victory']),
  });
  return { pm, calls };
};

describe('PhaseManager', () => {
  it('intro → active tras el cartel', () => {
    const { pm, calls } = make();
    pm.start();
    assert.equal(pm.status, PHASE_STATUS.INTRO);
    pm.update(PHASE_BANNER_TIME + 0.01);
    assert.equal(pm.status, PHASE_STATUS.ACTIVE);
    assert.deepEqual(calls, [['start', PHASES[0].name]]);
  });

  it('genera exactamente `count` enemigos y se supera al resolverlos todos', () => {
    const { pm, calls } = make();
    pm.start();
    pm.update(PHASE_BANNER_TIME + 0.01);
    let spawned = 0;
    for (let i = 0; i < 10000; i++) if (pm.shouldSpawnWaveEnemy(0.1)) spawned++;
    assert.equal(spawned, PHASES[0].count);
    for (let i = 0; i < PHASES[0].count; i++) pm.recordWaveEnemyGone({ killed: i % 2 === 0 });
    assert.equal(pm.status, PHASE_STATUS.CLEAR);
    assert.deepEqual(calls.at(-1), ['clear', PHASES[0].name, true]);
  });

  it('marca la fase como no perfecta si hubo daño', () => {
    const { pm, calls } = make();
    pm.start(1);
    pm.update(PHASE_BANNER_TIME + 0.01);
    pm.recordDamage(10);
    pm.clear();
    assert.equal(calls.at(-1)[2], false);
  });

  it('tras la última fase llama a onVictory', () => {
    const { pm, calls } = make();
    pm.start(PHASES.length - 1);
    pm.update(PHASE_BANNER_TIME + 0.01);
    pm.clear();
    pm.update(PHASE_BANNER_TIME + 0.01);
    assert.equal(pm.status, PHASE_STATUS.DONE);
    assert.deepEqual(calls.at(-1), ['victory']);
  });

  it('clear() fuera de una fase activa no hace nada', () => {
    const { pm, calls } = make();
    pm.start();
    pm.clear();
    assert.equal(pm.status, PHASE_STATUS.INTRO);
    assert.equal(calls.length, 0);
  });

  it('rechaza una fase inicial fuera de rango', () => {
    const { pm } = make();
    assert.throws(() => pm.start(PHASES.length), RangeError);
    assert.throws(() => pm.start(-1), RangeError);
  });
});
