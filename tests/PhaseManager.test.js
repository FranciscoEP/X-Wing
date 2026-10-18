import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FORMATION, PHASE_BANNER_TIME, PHASE_TYPE, PHASES } from '../js/config.js';
import { PHASE_STATUS, PhaseManager } from '../js/sim/PhaseManager.js';
import { resetRandomSource, useSeed } from './helpers.js';

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

  it('genera escuadrones al azar hasta `count` enemigos exactos y se supera al resolverlos', () => {
    const { pm, calls } = make();
    pm.start();
    pm.update(PHASE_BANNER_TIME + 0.01);
    const squadrons = [];
    for (let i = 0; i < 10000; i++) {
      const sq = pm.nextSquadron(0.1);
      if (sq) squadrons.push(sq);
    }
    const total = squadrons.reduce((n, sq) => n + sq.size, 0);
    assert.equal(total, PHASES[0].count);
    const known = new Set(PHASES[0].squadrons.map((s) => s.formation));
    assert.ok(squadrons.every((sq) => known.has(sq.formation)));
    for (let i = 0; i < PHASES[0].count; i++) pm.recordWaveEnemyGone({ killed: i % 2 === 0 });
    assert.equal(pm.status, PHASE_STATUS.CLEAR);
    assert.deepEqual(calls.at(-1), ['clear', PHASES[0].name, true]);
  });

  /** Fase de oleada larga con dos escuadrones distinguibles por tamaño. */
  const longWave = (squadrons) => [{ type: PHASE_TYPE.WAVE, name: 'Prueba', count: 2000, squadronEvery: 1, squadrons }];
  const drain = (pm, dt = 0.05) => {
    const out = [];
    const gaps = [];
    let since = 0;
    for (let i = 0; i < 100000 && pm.spawned < pm.phase.count; i++) {
      since += dt;
      const sq = pm.nextSquadron(dt);
      if (!sq) continue;
      out.push(sq);
      gaps.push(since);
      since = 0;
    }
    return { out, gaps: gaps.slice(1) };
  };

  it('nunca repite el mismo escuadrón dos veces seguidas y respeta los pesos', () => {
    useSeed(7);
    const pm = new PhaseManager({}, longWave([
      { formation: FORMATION.V, size: 1, weight: 3 },
      { formation: FORMATION.COLUMN, size: 1, weight: 1 },
      { formation: FORMATION.PINCER, size: 1, weight: 1 },
    ]));
    pm.start();
    pm.update(PHASE_BANNER_TIME + 0.01);
    const { out } = drain(pm);
    resetRandomSource();
    assert.ok(out.every((sq, i) => i === 0 || sq.formation !== out[i - 1].formation), 'repitió escuadrón');
    const share = out.filter((sq) => sq.formation === FORMATION.V).length / out.length;
    // Sin repetir, V (peso 3) sale como mucho la mitad de las veces, pero más que las otras
    assert.ok(share > 0.4 && share <= 0.5, `V salió ${(share * 100).toFixed(0)}%`);
  });

  it('el intervalo entre escuadrones varía alrededor de `squadronEvery`', () => {
    useSeed(3);
    const pm = new PhaseManager({}, longWave([{ formation: FORMATION.V, size: 1 }, { formation: FORMATION.COLUMN, size: 1 }]));
    pm.start();
    pm.update(PHASE_BANNER_TIME + 0.01);
    const { gaps } = drain(pm, 0.01);
    resetRandomSource();
    const min = Math.min(...gaps);
    const max = Math.max(...gaps);
    assert.ok(min >= 0.74 && max <= 1.27, `intervalos entre ${min} y ${max}`);
    assert.ok(max - min > 0.3, 'el intervalo no varía');
  });

  it('dos partidas con distinta semilla no reciben la misma secuencia de escuadrones', () => {
    const sequence = (seed) => {
      useSeed(seed);
      const pm = new PhaseManager();
      pm.start();
      pm.update(PHASE_BANNER_TIME + 0.01);
      const seq = drain(pm).out.map((sq) => sq.formation).join(' ');
      resetRandomSource();
      return seq;
    };
    const seqs = new Set([1, 2, 3, 4, 5].map(sequence));
    assert.ok(seqs.size >= 4, `solo ${seqs.size} secuencias distintas en 5 partidas`);
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
