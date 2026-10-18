import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { COMBAT, PLAYER, SCORE, TORPEDO } from '../js/config.js';
import { PowerUp } from '../js/sim/entities/PowerUp.js';
import { emitted, enemyBulletAt, makeWorld, playerBulletAt, resetRandomSource, run, skipIntro, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

/** Mundo en la fase 1 ya activa, sin enemigos y con el jugador vulnerable. */
function arena() {
  const world = makeWorld({ phase: 0 });
  skipIntro(world);
  world.enemies.length = 0;
  world.enemyBullets.length = 0;
  world.phases.spawned = world.phases.phase.count; // que no aparezcan más
  world.player.invulnerable = 0;
  return world;
}

describe('combate: balas enemigas vs jugador', () => {
  it('regresión: una bala dirigida al centro de la nave le hace daño', () => {
    const world = arena();
    const { player } = world;
    world.spawnEnemyBullet(enemyBulletAt(player.cx + 80, player.cy));
    run(world, 0.5);
    assert.equal(player.hp, PLAYER.MAX_HP - 10);
    assert.equal(emitted(world, 'playerHit').length, 1);
  });

  it('regresión: un TIE disparando a un jugador quieto acaba acertando', () => {
    const world = makeWorld({ phase: 0 });
    skipIntro(world);
    world.player.invulnerable = 0;
    run(world, 20);
    assert.ok(emitted(world, 'playerHit').length > 0, 'ninguna bala enemiga hizo daño en 20 s');
  });

  it('una bala que solo roza la punta del ala no hace daño (hitbox justa)', () => {
    const world = arena();
    const { player } = world;
    world.spawnEnemyBullet(enemyBulletAt(player.cx + 80, player.y + 3));
    run(world, 0.5);
    assert.equal(player.hp, PLAYER.MAX_HP);
  });

  it('con escudo la bala se bloquea sin daño', () => {
    const world = arena();
    world.player.grantPowerUp('SHIELD', 5);
    world.spawnEnemyBullet(enemyBulletAt(world.player.cx + 80, world.player.cy));
    run(world, 0.5);
    assert.equal(world.player.hp, PLAYER.MAX_HP);
    assert.equal(emitted(world, 'shieldBlock').length, 1);
  });
});

describe('combate: disparos del jugador vs enemigos', () => {
  it('regresión: los láseres del jugador destruyen a un TIE y suman puntos', () => {
    const world = arena();
    const enemy = world.spawnEnemy('TIE_FIGHTER', { y: world.player.cy - 22 });
    enemy.x = 500;
    run(world, 1.5, { shoot: true }, { until: () => enemy.dead });
    assert.ok(enemy.dead && !enemy.escaped);
    assert.equal(emitted(world, 'enemyDestroyed').length, 1);
    assert.ok(world.score >= enemy.score);
  });

  it('una bala solo daña a un enemigo', () => {
    const world = arena();
    const a = world.spawnEnemy('TIE_INTERCEPTOR', { y: 200 });
    const b = world.spawnEnemy('TIE_INTERCEPTOR', { y: 200 });
    a.x = b.x = 500;
    b.age = a.age;
    a.speed = b.speed = 0;
    world.update(0); // aplica el balanceo para conocer la posición real
    world.playerBullets.push(playerBulletAt(480, a.cy));
    world.update(1 / 60);
    world.update(1 / 60);
    assert.equal(a.hp + b.hp, a.cfg.hp * 2 - 10);
  });

  it('chocar con un TIE lo destruye y quita vida al jugador', () => {
    const world = arena();
    const enemy = world.spawnEnemy('TIE_FIGHTER', { y: world.player.y });
    enemy.x = world.player.x + 10;
    world.update(1 / 60);
    assert.ok(enemy.dead);
    assert.equal(world.player.hp, PLAYER.MAX_HP - COMBAT.ENEMY_CONTACT_DAMAGE);
  });
});

describe('combate: power-ups', () => {
  it('se recogen al tocarlos y suman puntos', () => {
    const world = arena();
    world.powerUps.push(new PowerUp('TRIPLE_SHOT', world.player.cx, world.player.cy));
    world.update(1 / 60);
    assert.ok(world.player.hasPowerUp('TRIPLE_SHOT'));
    assert.equal(world.score, SCORE.POWERUP);
    assert.equal(world.powerUps.length, 0);
  });
});

describe('combate: torpedos', () => {
  it('regresión: el torpedo es un proyectil visible que viaja antes de explotar', () => {
    const world = arena();
    world.update(1 / 60, { torpedo: true });
    assert.equal(world.torpedoes.length, 1, 'el torpedo existe en el mundo para dibujarse');
    const x0 = world.torpedoes[0].x;
    run(world, 0.2);
    assert.ok(world.torpedoes[0].x > x0);
    assert.equal(emitted(world, 'torpedoLaunched').length, 1);
  });

  it('explota al tocar un enemigo: daña en área y borra balas cercanas', () => {
    const world = arena();
    const near = world.spawnEnemy('TIE_FIGHTER', { y: world.player.cy - 22 });
    const other = world.spawnEnemy('TIE_FIGHTER', { y: world.player.cy + 40 });
    const far = world.spawnEnemy('TIE_FIGHTER', { y: 20 });
    near.x = other.x = 420;
    far.x = 880;
    world.spawnEnemyBullet(enemyBulletAt(430, world.player.cy + 60, 0, 0));
    world.update(1 / 60, { torpedo: true });
    run(world, 1, {}, { until: (w) => emitted(w, 'torpedoBlast').length > 0 });
    const [blast] = emitted(world, 'torpedoBlast');
    assert.ok(blast, 'no explotó');
    assert.equal(blast.payload.radius, TORPEDO.BLAST_RADIUS);
    assert.ok(near.dead && other.dead, 'los cercanos mueren');
    assert.ok(!far.dead, 'el lejano sobrevive');
    assert.equal(world.enemyBullets.length, 0);
    assert.equal(world.torpedoes.length, 0);
  });

  it('sin torpedos no lanza nada', () => {
    const world = arena();
    world.player.torpedoCount = 0;
    world.update(1 / 60, { torpedo: true });
    assert.equal(world.torpedoes.length, 0);
  });
});
