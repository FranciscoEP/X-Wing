import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CANVAS, PLAYER, POWERUP_ITEM, TORPEDO } from '../js/config.js';
import { Enemy } from '../js/sim/entities/Enemy.js';
import { Player } from '../js/sim/entities/Player.js';
import { PowerUp } from '../js/sim/entities/PowerUp.js';
import { applyPowerUp } from '../js/sim/powerups.js';
import { DT, NORMAL, resetRandomSource, useSeed } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

const tick = (entity, seconds, ...args) => {
  for (let t = 0; t < seconds; t += DT) entity.update(DT, ...args);
};

describe('Player', () => {
  it('se mueve con los controles y no sale de los límites', () => {
    const p = new Player(3);
    const x0 = p.x;
    tick(p, 0.5, { moveX: 1 });
    assert.ok(p.x > x0);
    tick(p, 10, { moveX: 1, moveY: 1 });
    assert.ok(p.x <= CANVAS.WIDTH * PLAYER.MAX_X_RATIO - p.width);
    assert.ok(p.y <= CANVAS.HEIGHT - p.height - PLAYER.MARGIN);
    tick(p, 10, { moveX: -1, moveY: -1 });
    assert.equal(p.x, PLAYER.MARGIN);
    assert.equal(p.y, PLAYER.MARGIN);
  });

  it('la diagonal no es más rápida que un eje', () => {
    const straight = new Player(3);
    const diagonal = new Player(3);
    tick(straight, 0.1, { moveX: 1 });
    tick(diagonal, 0.1, { moveX: 1, moveY: 1 });
    assert.ok(Math.hypot(diagonal.vx, diagonal.vy) <= Math.hypot(straight.vx, straight.vy) + 1e-9);
  });

  it('dispara 2 láseres y respeta el cooldown', () => {
    const p = new Player(3);
    assert.equal(p.tryShoot().length, 2);
    assert.equal(p.tryShoot().length, 0);
    tick(p, PLAYER.FIRE_COOLDOWN + DT);
    assert.equal(p.tryShoot().length, 2);
  });

  it('disparo triple añade 3 balas y fuego rápido reduce el cooldown', () => {
    const p = new Player(3);
    applyPowerUp(p, 'TRIPLE_SHOT');
    applyPowerUp(p, 'RAPID_FIRE');
    assert.equal(p.tryShoot().length, 5);
    assert.ok(Math.abs(p.fireTimer - PLAYER.FIRE_COOLDOWN * PLAYER.RAPID_FIRE_FACTOR) < 1e-9);
  });

  it('el daño da invulnerabilidad breve y la muerte quita una vida', () => {
    const p = new Player(2);
    p.invulnerable = 0;
    assert.equal(p.takeDamage(30), false);
    assert.equal(p.hp, PLAYER.MAX_HP - 30);
    assert.equal(p.takeDamage(30), false, 'invulnerable: ignora el golpe');
    assert.equal(p.hp, PLAYER.MAX_HP - 30);
    p.invulnerable = 0;
    assert.equal(p.takeDamage(500), true);
    assert.equal(p.lives, 1);
    assert.ok(p.dead);
  });

  it('el escudo bloquea el daño hasta que expira', () => {
    const p = new Player(3);
    p.invulnerable = 0;
    applyPowerUp(p, 'SHIELD');
    assert.equal(p.canBeHit, false);
    tick(p, 7);
    assert.equal(p.canBeHit, true);
  });

  it('lanza torpedos mientras le queden', () => {
    const p = new Player(3);
    const start = p.torpedoCount;
    for (let i = 0; i < start; i++) assert.ok(p.launchTorpedo());
    assert.equal(p.launchTorpedo(), null);
    applyPowerUp(p, 'TORPEDO');
    assert.equal(p.torpedoCount, 1);
  });

  it('no supera el máximo de torpedos ni de vida', () => {
    const p = new Player(3);
    p.addTorpedoes(99);
    assert.equal(p.torpedoCount, PLAYER.MAX_TORPEDOES);
    p.heal(999);
    assert.equal(p.hp, PLAYER.MAX_HP);
  });
});

describe('Enemy', () => {
  const world = { player: new Player(3), playerBullets: [], shots: [], emit() {}, spawnEnemyBullet(b) { this.shots.push(b); } };

  it('avanza hacia la izquierda, dispara al jugador y escapa', () => {
    const e = new Enemy('TIE_FIGHTER', NORMAL, { y: 200 });
    tick(e, 3, world);
    assert.ok(world.shots.length > 0, 'disparó');
    assert.ok(world.shots.every((b) => b.vx < 0), 'dispara hacia la izquierda');
    tick(e, 20, world);
    assert.ok(e.dead && e.escaped);
  });

  it('muere al llegar a 0 de vida y no muere dos veces', () => {
    const e = new Enemy('TIE_FIGHTER', NORMAL);
    assert.equal(e.takeDamage(10), false);
    assert.equal(e.takeDamage(10), true);
    assert.equal(e.takeDamage(10), false);
  });

  it('rechaza tipos desconocidos', () => {
    assert.throws(() => new Enemy('X', NORMAL));
  });
});

describe('PowerUp', () => {
  it('desaparece al terminar su tiempo de vida', () => {
    const p = new PowerUp('REPAIR', 400, 200);
    tick(p, POWERUP_ITEM.LIFETIME + DT);
    assert.ok(p.dead);
  });

  it('reparación cura sin pasarse del máximo', () => {
    const player = new Player(3);
    player.hp = 50;
    applyPowerUp(player, 'REPAIR');
    assert.equal(player.hp, 90);
  });

  it('un tipo sin efecto lanza un error claro', () => {
    assert.throws(() => applyPowerUp(new Player(3), 'NOPE'), /sin efecto/);
  });
});

describe('Torpedo', () => {
  it('vuela hacia la derecha y expira por tiempo', () => {
    const t = new Player(3).launchTorpedo();
    const x0 = t.x;
    tick(t, 0.2);
    assert.ok(t.x > x0);
    tick(t, TORPEDO.MAX_FLIGHT);
    assert.ok(t.expired);
  });
});
