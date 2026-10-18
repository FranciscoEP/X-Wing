import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { MINE, PHASES, PLAYER, WEAPONS } from '../js/config.js';
import { spawnSquadron } from '../js/sim/ai/formations.js';
import { cruise } from '../js/sim/ai/movement.js';
import { Mine } from '../js/sim/entities/Mine.js';
import { Torpedo } from '../js/sim/entities/Torpedo.js';
import { DT, emitted, godMode, makeWorld, playerBulletAt, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

/** Oleada activa sin generar más enemigos, para colocarlos a mano. */
function arena() {
  const world = makeWorld({ phase: 0 });
  skipIntro(world);
  world.enemies.length = 0;
  world.squadrons.length = 0;
  world.phases.spawned = world.phases.phase.count;
  return world;
}

/** Nave quieta (sin avanzar ni ondular) a la altura `cy`. */
function still(world, type, cy, x = 700) {
  const e = world.spawnEnemy(type, { x, y: 0, movement: cruise({ baseY: 0, wobble: 0 }) });
  const y = cy - e.height / 2;
  e.movement = cruise({ baseY: y, wobble: 0 });
  e.y = e.pathY = y;
  e.speed = 0;
  return e;
}

describe('firma del TIE Fighter: par de láseres rectos cuando te tiene enfrente', () => {
  it('no dispara si el jugador no está en su línea', () => {
    const world = arena();
    still(world, 'TIE_FIGHTER', world.player.cy + 200);
    run(world, 5, godMode);
    assert.equal(world.enemyBullets.length, 0);
  });

  it('avisa 0,3 s antes y dispara dos láseres horizontales y paralelos', () => {
    const world = arena();
    const tie = still(world, 'TIE_FIGHTER', world.player.cy);
    run(world, 5, godMode, { until: () => emitted(world, 'enemyCharge').length > 0 });
    assert.ok(tie.weapon.charge >= 0 && world.enemyBullets.length === 0, 'aún no dispara al empezar el aviso');
    run(world, WEAPONS.TWIN.charge / 2, godMode);
    assert.ok(tie.weapon.charge > 0.3, 'el aviso está en curso');
    assert.equal(world.enemyBullets.length, 0);
    run(world, WEAPONS.TWIN.charge, godMode, { until: (w) => w.enemyBullets.length > 0 });
    const [a, b] = world.enemyBullets;
    assert.equal(world.enemyBullets.length, 2);
    assert.ok(a.vy === 0 && b.vy === 0 && a.vx < 0, 'rectos hacia la izquierda');
    assert.ok(Math.abs(Math.abs(a.cy - b.cy) - WEAPONS.TWIN.gap * 2) < 1e-6);
  });

  it('cada TIE dispara a su propio ritmo, no todos a la vez', () => {
    const world = arena();
    const ties = [still(world, 'TIE_FIGHTER', world.player.cy, 600), still(world, 'TIE_FIGHTER', world.player.cy, 760)];
    const firstShot = new Map();
    world.events.on('enemyTwinShot', ({ enemy }) => !firstShot.has(enemy) && firstShot.set(enemy, world.stats.time));
    run(world, 6, godMode, { until: () => firstShot.size === 2 });
    assert.equal(firstShot.size, 2);
    assert.notEqual(firstShot.get(ties[0]), firstShot.get(ties[1]));
  });
});

describe('firma del Interceptor: pasada en diagonal con abanico', () => {
  function pass(world) {
    const [e] = spawnSquadron(world, 'TIE_INTERCEPTOR', { formation: 'SLASH', size: 1 });
    e.evasion.chance = 0;
    return e;
  }

  it('antes de entrar marca una diagonal que pasa por donde estaba el jugador', () => {
    const world = arena();
    const e = pass(world);
    world.update(DT, {});
    const w = e.movement.warning;
    assert.ok(w, 'hay aviso');
    assert.ok(e.isOffScreen(0), 'todavía no está en pantalla');
    // distancia del centro del jugador a la recta del aviso
    const vx = world.player.cx - w.x;
    const vy = world.player.cy - w.y;
    assert.ok(Math.abs(vx * w.dy - vy * w.dx) < 2);
  });

  it('cruza la pantalla rápido y se va (no se queda)', () => {
    const world = arena();
    const e = pass(world);
    world.update(DT, {}); // fija la diagonal
    world.player.y = world.player.y > 270 ? 20 : 440; // el jugador se aparta de la diagonal
    const start = world.stats.time;
    run(world, 6, godMode, { until: () => e.dead });
    assert.ok(e.dead && e.escaped, 'escapó sin chocar');
    assert.ok(world.stats.time - start < 3, `tardó ${(world.stats.time - start).toFixed(1)} s`);
  });

  it('si el jugador no se aparta, la pasada lo embiste', () => {
    const world = arena();
    world.player.invulnerable = 0;
    const e = pass(world);
    run(world, 4, () => ({}), { until: () => e.dead });
    assert.ok(e.dead && !e.escaped);
    assert.ok(world.player.hp < PLAYER.MAX_HP);
  });

  it('dispara un abanico de 3 al cruzar la altura del jugador, una sola vez', () => {
    const world = arena();
    const e = pass(world);
    let fans = 0;
    const spawn = world.spawnEnemyBullet.bind(world);
    world.spawnEnemyBullet = (b) => {
      fans++;
      spawn(b);
    };
    run(world, 6, godMode, { until: () => e.dead });
    assert.equal(fans, WEAPONS.FAN.count * WEAPONS.FAN.shots);
  });
});

describe('firma del TIE Bomber: minas', () => {
  it('suelta minas mientras está por delante del jugador', () => {
    const world = arena();
    still(world, 'TIE_BOMBER', 200, 650);
    run(world, 6, godMode);
    assert.ok(emitted(world, 'mineDropped').length >= 2);
    assert.equal(world.enemyBullets.length, 0, 'no dispara láseres');
  });

  it('la mina estalla al acabar su tiempo y daña solo dentro de su radio', () => {
    // la mina deriva hacia la izquierda durante su vida: la lejana parte más allá de ese recorrido
    for (const [offset, hurts] of [[MINE.radius * 0.6, true], [MINE.radius * 1.5 + MINE.drift * MINE.lifetime, false]]) {
      const world = arena();
      world.player.invulnerable = 0;
      world.spawnMine(new Mine(world.player.cx + offset, world.player.cy));
      // quieto: la mina se le acerca al derivar, pero sin llegar a la distancia de proximidad
      run(world, MINE.lifetime + 0.5, () => ({}), { until: (w) => w.mines.length === 0 });
      assert.equal(emitted(world, 'mineBlast').length, 1);
      assert.equal(world.player.hp < PLAYER.MAX_HP, hurts, `a ${offset} unidades`);
    }
  });

  it('si el jugador se acerca, se arma y estalla tras una mecha corta', () => {
    const world = arena();
    world.player.invulnerable = 0;
    world.spawnMine(new Mine(world.player.cx + 20, world.player.cy));
    const start = world.stats.time;
    run(world, 1, () => ({}), { until: (w) => w.mines.length === 0 });
    assert.equal(emitted(world, 'mineArmed').length, 1);
    assert.ok(world.stats.time - start < MINE.fuse + 0.1);
    assert.ok(world.player.hp < PLAYER.MAX_HP);
  });

  it('un láser la destruye sin que explote', () => {
    const world = arena();
    const mine = new Mine(600, world.player.cy);
    world.spawnMine(mine);
    world.playerBullets.push(playerBulletAt(560, world.player.cy));
    run(world, 0.3, godMode);
    assert.ok(mine.dead);
    assert.equal(emitted(world, 'mineDestroyed').length, 1);
    assert.equal(emitted(world, 'mineBlast').length, 0);
  });

  it('un torpedo detona al tocar una mina y limpia las cercanas', () => {
    const world = arena();
    // una en la línea del torpedo (la toca y detona) y otra cerca (cae en la onda)
    const mines = [new Mine(600, 270), new Mine(640, 340)];
    mines.forEach((m) => world.spawnMine(m));
    world.torpedoes.push(new Torpedo(480, 270));
    run(world, 1, godMode, { until: (w) => w.torpedoes.length === 0 });
    assert.ok(mines.every((m) => m.dead));
    assert.equal(emitted(world, 'mineBlast').length, 0);
  });
});

describe('fase de asalto: mezcla de firmas', () => {
  it('trae Interceptores en pasada y Bombers en la misma oleada', () => {
    const types = new Set(PHASES[2].squadrons.map((s) => s.enemy ?? PHASES[2].enemy));
    assert.ok(types.has('TIE_INTERCEPTOR') && types.has('TIE_BOMBER'));
    const seen = new Set();
    for (let seed = 1; seed <= 5; seed++) {
      useSeed(seed);
      const world = makeWorld({ phase: 2 });
      run(world, 120, (w) => (godMode(w), w.enemies.forEach((e) => seen.add(e.type)), { shoot: true, moveY: Math.sin(w.stats.time) }), {
        until: (w) => w.phases.number > 3,
      });
      assert.equal(world.phases.number, 4, `semilla ${seed}: la oleada no terminó`);
    }
    assert.ok(seen.has('TIE_INTERCEPTOR') && seen.has('TIE_BOMBER'), [...seen].join(','));
  });
});
