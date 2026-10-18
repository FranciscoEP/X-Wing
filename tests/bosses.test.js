import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PHASES, TORPEDO } from '../js/config.js';
import { centerOf } from '../js/core/utils.js';
import { HIT } from '../js/sim/bosses/Boss.js';
import { LASER_STATE } from '../js/sim/bosses/DeathStar.js';
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
  for (const type of ['TIE_ADVANCED', 'STAR_DESTROYER', 'DEATH_STAR']) {
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

describe('Destructor Estelar', () => {
  it('solo el triángulo del casco recibe impactos', () => {
    const world = makeWorld({ phase: phaseOf('STAR_DESTROYER') });
    waitBossReady(world);
    const { boss } = world;
    const corner = { x: boss.x + 5, y: boss.y + 2, width: 4, height: 4 };
    const middle = { x: boss.x + boss.width * 0.7, y: boss.cy - 2, width: 4, height: 4 };
    assert.equal(boss.hitTest(corner), null);
    assert.equal(boss.hitTest(middle), HIT.DAMAGE);
  });

  it('lanza TIE Fighters desde el hangar', () => {
    const world = makeWorld({ phase: phaseOf('STAR_DESTROYER') });
    waitBossReady(world);
    run(world, 5, godMode);
    assert.ok(world.enemies.some((e) => !e.fromWave));
  });
});

describe('Estrella de la Muerte', () => {
  /** `frozen`: el jefe deja de moverse y atacar, para disparar a un punto fijo. */
  const ready = ({ frozen = false } = {}) => {
    const world = makeWorld({ phase: phaseOf('DEATH_STAR') });
    waitBossReady(world);
    if (frozen) world.boss.behave = () => {};
    return world;
  };
  const portY = (w) => centerOf(w.boss.port).y;

  it('regresión: lo que entra en la esfera a la altura del puerto cuenta como impacto', () => {
    const world = ready();
    const { boss } = world;
    const port = centerOf(boss.port);
    // Justo dentro del borde de la esfera, a la izquierda del puerto: antes devolvía ARMOR
    const edge = { x: boss.cx - Math.sqrt(boss.width ** 2 / 4 - (port.y - boss.cy) ** 2) + 2, y: port.y - 1.5, width: 22, height: 3 };
    assert.equal(boss.hitTest(edge), HIT.DAMAGE);
  });

  it('regresión: un láser horizontal a la altura del puerto lo daña (no rebota en el borde)', () => {
    const world = ready({ frozen: true });
    const { boss } = world;
    const hp = boss.hp;
    world.playerBullets.push(playerBulletAt(world.player.x + 100, portY(world)));
    run(world, 1, godMode, { until: (w) => w.playerBullets.length === 0 });
    assert.ok(boss.hp < hp, 'el disparo al puerto no hizo daño');
    assert.equal(emitted(world, 'bossHit').length, 1);
  });

  it('regresión: apuntar el centro de la nave al puerto le quita vida de forma sostenida', () => {
    const world = ready();
    run(world, 15, aimAt(portY));
    assert.ok(world.boss.hp < world.boss.maxHp * 0.7, `solo bajó a ${world.boss.hp}/${world.boss.maxHp}`);
  });

  it('un disparo lejos del puerto rebota en el blindaje', () => {
    const world = ready({ frozen: true });
    const { boss } = world;
    const y = portY(world) > boss.cy ? portY(world) - 120 : portY(world) + 120;
    world.playerBullets.push(playerBulletAt(world.player.x + 100, y));
    run(world, 1, godMode, { until: (w) => w.playerBullets.length === 0 });
    assert.equal(boss.hp, boss.maxHp);
    assert.equal(emitted(world, 'armorHit').length, 1);
  });

  it('un torpedo en el puerto causa daño directo', () => {
    const world = ready({ frozen: true });
    const { boss } = world;
    world.torpedoes.push(new Torpedo(boss.port.x - 40, portY(world)));
    run(world, 0.5, godMode, { until: (w) => w.torpedoes.length === 0 });
    assert.equal(boss.hp, boss.maxHp - TORPEDO.BOSS_DAMAGE);
  });

  it('el superláser fija la altura del jugador, avisa y daña si no se mueve', () => {
    const world = ready();
    world.player.invulnerable = 0;
    run(world, 12, {}, { until: (w) => w.boss.laserState === LASER_STATE.CHARGING });
    assert.equal(world.boss.laserY, world.player.cy, 'apunta a la altura del jugador');
    const hp = world.player.hp;
    // Se eliminan las demás balas para medir solo el daño del rayo
    const onlyLaser = (w) => {
      w.enemyBullets.length = 0;
      return {};
    };
    run(world, 3, onlyLaser, { until: (w) => emitted(w, 'superlaser').length > 0 && w.boss.laserState === LASER_STATE.IDLE });
    assert.ok(world.player.hp < hp || world.player.dead, 'el rayo no hizo daño');
  });
});
