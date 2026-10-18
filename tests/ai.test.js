import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { BULLET, CANVAS, DIFFICULTIES, FORMATION, PHASES } from '../js/config.js';
import { interceptAngle } from '../js/sim/ai/aim.js';
import { Evasion } from '../js/sim/ai/evasion.js';
import { spawnSquadron } from '../js/sim/ai/formations.js';
import { cruise } from '../js/sim/ai/movement.js';
import { HIT } from '../js/sim/bosses/Boss.js';
import { CHARGE, VADER_MODE, VADER_STAGE } from '../js/sim/bosses/TieAdvanced.js';
import { Enemy } from '../js/sim/entities/Enemy.js';
import { DT, emitted, godMode, makeWorld, playerBulletAt, resetRandomSource, run, skipIntro, useSeed, waitBossReady } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

/** Distancia mínima entre una bala y un objetivo que se mueven en línea recta. */
function closestApproach(from, angle, speed, target, seconds = 3) {
  let best = Infinity;
  for (let t = 0; t < seconds; t += 1 / 240) {
    const bx = from.x + Math.cos(angle) * speed * t;
    const by = from.y + Math.sin(angle) * speed * t;
    best = Math.min(best, Math.hypot(bx - (target.cx + target.vx * t), by - (target.cy + target.vy * t)));
  }
  return best;
}

/** Mundo en una oleada activa, vacío, para colocar enemigos a mano. */
function arena() {
  const world = makeWorld({ phase: 0 });
  skipIntro(world);
  world.enemies.length = 0;
  world.phases.spawned = world.phases.phase.count;
  return world;
}

describe('IA: puntería predictiva', () => {
  const from = { x: 800, y: 270 };
  const moving = { cx: 200, cy: 270, vx: 0, vy: 300 };

  it('con lead=1 la bala intercepta a un objetivo en movimiento', () => {
    const angle = interceptAngle(from, moving, BULLET.ENEMY_SPEED, 1);
    assert.ok(closestApproach(from, angle, BULLET.ENEMY_SPEED, moving) < 2);
  });

  it('con lead=0 dispara a la posición actual (y falla si el objetivo se mueve)', () => {
    const angle = interceptAngle(from, moving, BULLET.ENEMY_SPEED, 0);
    assert.equal(angle, Math.PI);
    assert.ok(closestApproach(from, angle, BULLET.ENEMY_SPEED, moving) > 100);
  });

  it('si el objetivo es inalcanzable apunta directo en vez de devolver NaN', () => {
    const fast = { cx: 200, cy: 270, vx: -2000, vy: 0 };
    const angle = interceptAngle(from, fast, BULLET.ENEMY_SPEED, 1);
    assert.ok(Number.isFinite(angle));
  });

  it('los TIE de HARD anticipan más que los de EASY', () => {
    const world = arena();
    world.player.vy = 300;
    const shot = (difficulty) => {
      useSeed(1);
      const e = new Enemy('TIE_FIGHTER', difficulty, { x: 700, y: world.player.cy - 22 });
      return e.aimAt(world.player);
    };
    assert.ok(shot(DIFFICULTIES.HARD).vy > shot(DIFFICULTIES.EASY).vy);
  });
});

describe('IA: formaciones', () => {
  for (const formation of Object.values(FORMATION)) {
    it(`${formation}: genera el tamaño pedido, todos de la oleada`, () => {
      const world = arena();
      const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation, size: 4 });
      assert.equal(squad.length, 4);
      assert.ok(squad.every((e) => e.fromWave));
    });
  }

  it('V: líder al frente y alas simétricas', () => {
    const world = arena();
    const [leader, a, b] = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.V, size: 3 });
    assert.ok(a.x > leader.x && a.x === b.x);
    assert.ok(Math.abs(a.y - leader.y - (leader.y - b.y)) < 1e-6);
  });

  it('COLUMNA: misma altura base, en fila india', () => {
    const world = arena();
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.COLUMN, size: 3 });
    assert.ok(squad[0].x < squad[1].x && squad[1].x < squad[2].x);
    assert.equal(new Set(squad.map((e) => e.y)).size, 1);
  });

  it('TENAZA: entra por arriba y por abajo y converge hacia el jugador', () => {
    const world = arena();
    godMode(world);
    const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.PINCER, size: 2 });
    assert.ok(squad[0].y < 0 && squad[1].y >= CANVAS.HEIGHT, 'nacen fuera de pantalla');
    world.update(DT);
    assert.ok(squad[0].y < 0, 'regresión: no se teletransportan al entrar');
    run(world, 2, godMode);
    const gap = (e) => Math.abs(e.cy - world.player.cy);
    assert.ok(squad.every((e) => gap(e) < 150), 'convergen hacia la altura del jugador');
  });

  it('regresión: con el jugador pegado a un borde, la tenaza entra en pantalla y la oleada puede terminar', () => {
    for (const edgeY of [0, CANVAS.HEIGHT]) {
      const world = arena();
      godMode(world);
      world.player.y = edgeY === 0 ? 8 : CANVAS.HEIGHT - world.player.height - 8;
      const squad = spawnSquadron(world, 'TIE_FIGHTER', { formation: FORMATION.PINCER, size: 4 });
      run(world, 20, godMode, { until: () => squad.every((e) => e.dead) });
      assert.ok(squad.every((e) => e.dead), 'alguna nave quedó viva para siempre');
    }
  });

  it('PICADA: se lanzan hacia la posición del jugador', () => {
    const world = arena();
    world.player.y = 60;
    const [e] = spawnSquadron(world, 'TIE_INTERCEPTOR', { formation: FORMATION.DIVE, size: 1 });
    e.y = e.pathY = 400;
    run(world, 4, godMode, { until: () => emitted(world, 'enemyDive').length > 0 });
    const y0 = e.y;
    run(world, 0.3, godMode);
    assert.ok(e.y < y0, 'baja (sube en pantalla) hacia el jugador');
  });

  it('las oleadas de la partida usan escuadrones y terminan', () => {
    const world = makeWorld({ phase: 0 });
    run(world, 200, godMode, { until: (w) => w.phases.number === 2 });
    assert.equal(world.phases.number, 2);
    assert.ok(PHASES[0].squadrons.length > 1);
  });
});

describe('IA: esquiva', () => {
  const incoming = (world, enemy) => world.playerBullets.push(playerBulletAt(enemy.x - 200, enemy.cy));
  /** Interceptor inmóvil y sin ondulación: cualquier cambio de altura es la esquiva. */
  const target = (world) => {
    const e = world.spawnEnemy('TIE_INTERCEPTOR', { x: 600, y: 250, movement: cruise({ baseY: 250, wobble: 0 }) });
    e.speed = 0;
    return e;
  };

  it('un interceptor que decide esquivar evita el láser', () => {
    const world = arena();
    const e = target(world);
    e.evasion.chance = 1;
    incoming(world, e);
    run(world, 0.6, godMode);
    assert.equal(e.hp, e.cfg.hp, 'no recibió el impacto');
    assert.equal(emitted(world, 'enemyDodge').length, 1);
  });

  it('si no esquiva, el láser impacta', () => {
    const world = arena();
    const e = target(world);
    e.evasion.chance = 0;
    incoming(world, e);
    run(world, 0.6, godMode);
    assert.ok(e.hp < e.cfg.hp);
  });

  it('tras esquivar necesita recuperarse: una segunda ráfaga inmediata sí le alcanza', () => {
    const world = arena();
    const e = target(world);
    e.evasion.chance = 1;
    incoming(world, e);
    run(world, 0.4, godMode);
    incoming(world, e);
    run(world, 0.6, godMode);
    assert.ok(e.hp < e.cfg.hp, 'esquivó dos veces seguidas');
  });

  it('nunca esquiva fuera de la pantalla', () => {
    const ev = new Evasion({ chance: 1, reaction: 1, speed: 2000, cooldown: 0 });
    ev.offset = 5000;
    ev.clampTo(100, 40);
    assert.ok(100 + ev.offset + 40 <= CANVAS.HEIGHT);
  });
});

describe('IA: fases de Vader', () => {
  const vader = () => {
    const world = makeWorld({ phase: 1 });
    waitBossReady(world);
    return world;
  };

  it('cambia de etapa según la vida y lo anuncia', () => {
    const world = vader();
    const { boss } = world;
    assert.equal(boss.stage, VADER_STAGE.PURSUIT);
    boss.hp = boss.maxHp * 0.5;
    run(world, DT, godMode);
    assert.equal(boss.stage, VADER_STAGE.ASSAULT);
    boss.hp = boss.maxHp * 0.2;
    run(world, DT, godMode);
    assert.equal(boss.stage, VADER_STAGE.DESPERATE);
    assert.deepEqual(emitted(world, 'bossStage').map((e) => e.payload.stage.id), ['ASSAULT', 'DESPERATE']);
  });

  it('en persecución no embiste', () => {
    const world = vader();
    run(world, CHARGE.EVERY * 2, godMode);
    assert.equal(emitted(world, 'vaderMode').length, 0);
  });

  it('la embestida avisa, fija la altura del jugador y le golpea si no se mueve', () => {
    const world = vader();
    world.boss.hp = world.boss.maxHp * 0.5;
    world.enemyBullets.length = 0;
    const noBullets = (w) => {
      w.enemyBullets.length = 0;
      w.boss.fireTimer = 1; // aislar la embestida de los disparos
      return {};
    };
    run(world, CHARGE.EVERY + 1, noBullets, { until: (w) => w.boss.mode === VADER_MODE.WINDUP });
    assert.equal(world.boss.mode, VADER_MODE.WINDUP);
    world.player.invulnerable = 0;
    const hp = world.player.hp;
    run(world, 3, noBullets, { until: (w) => w.boss.mode === VADER_MODE.RETURN });
    assert.ok(world.player.hp < hp, 'la embestida no dañó a un jugador quieto');
  });

  it('si el jugador se aparta durante el aviso, la embestida falla', () => {
    const world = vader();
    world.boss.hp = world.boss.maxHp * 0.5;
    const noBullets = (w) => {
      w.enemyBullets.length = 0;
      w.boss.fireTimer = 1;
    };
    run(world, CHARGE.EVERY + 1, (w) => (noBullets(w), {}), { until: (w) => w.boss.mode === VADER_MODE.WINDUP });
    world.player.invulnerable = 0;
    const away = world.player.cy > CANVAS.HEIGHT / 2 ? -1 : 1;
    const hp = world.player.hp;
    run(world, 3, (w) => (noBullets(w), { moveY: away }), { until: (w) => w.boss.mode === VADER_MODE.RETURN });
    assert.equal(world.player.hp, hp);
  });

  it('desesperado: llama 2 escoltas y su escudo hace rebotar los disparos', () => {
    const world = vader();
    world.boss.hp = world.boss.maxHp * 0.2;
    run(world, DT * 2, godMode);
    const escorts = world.enemies.filter((e) => !e.fromWave);
    assert.equal(escorts.length, 2);
    assert.ok(world.boss.shielded);
    assert.equal(world.boss.hitTest(world.boss), HIT.ARMOR);
  });

  it('el escudo se apaga durante la embestida (ventana para atacarlo)', () => {
    const world = vader();
    world.boss.hp = world.boss.maxHp * 0.2;
    run(world, 10, godMode, { until: (w) => w.boss.mode === VADER_MODE.CHARGE });
    assert.equal(world.boss.mode, VADER_MODE.CHARGE);
    assert.equal(world.boss.shielded, false);
  });
});
