import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CANVAS, FORMATION } from '../js/config.js';
import { spawnSquadron } from '../js/sim/ai/formations.js';
import { cruise, SPAWN_X, strafe } from '../js/sim/ai/movement.js';
import { Squadron } from '../js/sim/ai/squadron.js';
import { DT, emitted, godMode, makeWorld, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

/** Mundo en una oleada activa, vacío, para colocar enemigos a mano. */
function arena({ phase = 0 } = {}) {
  const world = makeWorld({ phase });
  skipIntro(world);
  world.enemies.length = 0;
  world.squadrons.length = 0;
  world.phases.spawned = world.phases.phase.count;
  return world;
}

describe('IA: escalón', () => {
  it('forma una diagonal y se desliza hacia la altura del jugador', () => {
    const world = arena();
    godMode(world);
    world.player.y = CANVAS.HEIGHT - world.player.height - 8;
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.ECHELON, size: 4 });
    const ys = squad.map((e) => e.y);
    const steps = ys.slice(1).map((y, i) => y - ys[i]);
    assert.ok(steps.every((d) => d > 0) || steps.every((d) => d < 0), 'no es una diagonal');
    assert.ok(squad.every((e, i) => i === 0 || e.x > squad[i - 1].x));
    const mean = () => squad.reduce((s, e) => s + e.pathY, 0) / squad.length;
    const before = mean();
    run(world, 2, godMode);
    assert.ok(mean() > before + 40, 'no se acercó a la altura del jugador');
  });
});

describe('IA: hostigamiento', () => {
  const holder = (world) => {
    godMode(world);
    const [e] = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.STRAFE, size: 1 });
    e.squadron.volleyTimer = Infinity; // sin disparos: solo se mide el vuelo
    run(world, 15, godMode, { until: () => e.movement.state === 'hold' });
    assert.equal(e.movement.state, 'hold');
    return e;
  };

  it('se detiene en pantalla en vez de cruzarla', () => {
    const world = arena();
    const e = holder(world);
    const x0 = e.x;
    let minX = Infinity;
    run(world, 1.5, (w) => (godMode(w), (minX = Math.min(minX, e.x)), {}));
    assert.ok(e.x < CANVAS.WIDTH && minX > x0 - 30, `avanzó de ${x0} a ${minX}`);
  });

  it('sigue la altura del jugador con retraso', () => {
    const world = arena();
    const e = holder(world);
    world.player.y = e.cy > CANVAS.HEIGHT / 2 ? 30 : CANVAS.HEIGHT - world.player.height - 30;
    const gap = () => Math.abs(e.cy - world.player.cy);
    const before = gap();
    run(world, 0.1, godMode);
    assert.ok(gap() > 100, 'no debería alinearse al instante');
    run(world, 2.4, godMode);
    assert.ok(gap() < before / 3, `sigue a ${gap().toFixed(0)} px del jugador`);
  });

  it('al acabar el hostigamiento se retira por la derecha y cuenta como escapado', () => {
    const world = arena();
    const e = holder(world);
    run(world, 15, godMode, { until: () => e.dead });
    assert.ok(e.escaped && e.x > CANVAS.WIDTH, 'no se retiró por la derecha');
    assert.equal(emitted(world, 'enemyEscaped').length, 1);
  });

  it('regresión: si recibe la orden de retirada antes de entrar, entra y escapa igualmente', () => {
    const world = arena();
    godMode(world);
    const movement = strafe({ baseY: 200, holdX: 700, holdTime: 4 });
    const e = world.spawnEnemy('TIE_FIGHTER', { x: SPAWN_X + 200, y: 200, movement, fromWave: true });
    movement.retreat();
    run(world, 20, godMode, { until: () => e.dead });
    assert.ok(e.entered && e.escaped, 'una nave que nunca entra bloquea la oleada');
  });
});

describe('IA: líder del escuadrón', () => {
  const enteredV = () => {
    const world = arena();
    godMode(world);
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.V, size: 5 });
    squad[0].squadron.volleyTimer = Infinity;
    run(world, 3, godMode, { until: () => squad.every((e) => e.x < CANVAS.WIDTH - 40) });
    return { world, squad };
  };

  it('si derriban al líder, los dos compañeros más cercanos rompen filas y se lanzan en picada', () => {
    const { world, squad } = enteredV();
    world.hitEnemy(squad[0], 999);
    run(world, DT, godMode);
    const divers = squad.slice(1).filter((e) => e.movement.name === 'dive');
    assert.equal(divers.length, 2);
    assert.deepEqual(new Set(divers), new Set([squad[1], squad[2]]), 'deberían ser los de la primera fila');
    assert.equal(emitted(world, 'squadronBroken').length, 1);
    run(world, DT, godMode); // la picada se anuncia en su primer frame
    assert.equal(emitted(world, 'enemyDive').length, 2);
  });

  it('si el líder solo escapa, la formación se mantiene', () => {
    const { world, squad } = enteredV();
    squad[0].dead = true;
    squad[0].escaped = true;
    run(world, DT, godMode);
    assert.ok(squad.slice(1).every((e) => e.movement.name === 'cruise'));
    assert.equal(emitted(world, 'squadronBroken').length, 0);
  });

  it('los que hostigan se retiran al perder al líder', () => {
    const world = arena();
    godMode(world);
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.STRAFE, size: 3 });
    squad[0].squadron.volleyTimer = Infinity;
    run(world, 15, godMode, { until: () => squad.every((e) => e.movement.state === 'hold') });
    world.hitEnemy(squad[0], 999);
    run(world, DT, godMode);
    assert.ok(squad.slice(1).every((e) => e.movement.state === 'retreat'));
  });

  it('un escuadrón sin naves vivas desaparece del mundo', () => {
    const world = arena();
    godMode(world);
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.COLUMN, size: 3 });
    assert.equal(world.squadrons.length, 1);
    squad.forEach((e) => world.hitEnemy(e, 999));
    run(world, DT, godMode);
    assert.equal(world.squadrons.length, 0);
  });
});

describe('IA: oleadas completas', () => {
  it('ninguna semilla deja una oleada atascada', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const phase of [0, 2]) {
        useSeed(seed);
        const world = makeWorld({ phase });
        run(world, 300, (w) => (godMode(w), { shoot: true, moveY: Math.sin(w.stats.time) }), { until: (w) => w.phases.number > phase + 1 });
        assert.equal(world.phases.number, phase + 2, `semilla ${seed}: fase ${phase + 1} atascada`);
      }
    }
  });
});
