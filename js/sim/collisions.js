import { COMBAT, HITBOX } from '../config.js';
import { overlaps, shrink } from '../core/utils.js';
import { HIT } from './bosses/Boss.js';

/**
 * Resuelve todas las colisiones de un frame. Funciones puras sobre el `world`:
 * no dibujan ni reproducen sonido; los efectos se comunican con world.emit().
 */
export function resolveCollisions(world) {
  torpedoes(world);
  playerBulletsVsEnemies(world);
  playerBulletsVsMines(world);
  playerBulletsVsPort(world);
  playerBulletsVsBoss(world);
  if (world.player.dead) return;
  enemyBulletsVsPlayer(world);
  enemiesVsPlayer(world);
  bossVsPlayer(world);
  powerUpsVsPlayer(world);
}

/** Un torpedo detona al tocar un enemigo, una mina o un jefe, o al agotar su vuelo. */
function torpedoes(world) {
  const { boss } = world;
  const port = world.trench?.port;
  for (const torpedo of world.torpedoes) {
    if (torpedo.dead) continue;
    const bossHit = boss?.vulnerable ? boss.hitTest(torpedo) : null;
    const touchesEnemy = world.enemies.some((e) => !e.dead && overlaps(torpedo, e));
    const touchesMine = world.mines.some((m) => !m.dead && overlaps(torpedo, m));
    const portHit = port && !port.destroyed && overlaps(torpedo, port);
    if (bossHit || touchesEnemy || touchesMine || portHit || torpedo.expired) {
      world.detonateTorpedo(torpedo, { directBossHit: bossHit === HIT.DAMAGE });
      if (portHit) world.destroyPort();
    }
  }
}

function playerBulletsVsEnemies(world) {
  for (const bullet of world.playerBullets) {
    if (bullet.dead) continue;
    const enemy = world.enemies.find((e) => !e.dead && overlaps(bullet, shrink(e, HITBOX.ENEMY_VS_BULLET)));
    if (!enemy) continue;
    bullet.dead = true;
    world.recordHit();
    world.emit('enemyHit', { x: bullet.cx, y: bullet.cy });
    world.hitEnemy(enemy, bullet.damage);
  }
}

function playerBulletsVsMines(world) {
  for (const bullet of world.playerBullets) {
    if (bullet.dead) continue;
    const mine = world.mines.find((m) => !m.dead && overlaps(bullet, m));
    if (!mine) continue;
    bullet.dead = true;
    if (mine.takeDamage(bullet.damage)) world.destroyMine(mine);
  }
}

/** Los láseres no bastan para el puerto de escape: rebotan (hace falta un torpedo). */
function playerBulletsVsPort(world) {
  const port = world.trench?.port;
  if (!port || port.destroyed) return;
  for (const bullet of world.playerBullets) {
    if (bullet.dead || !overlaps(bullet, port)) continue;
    bullet.dead = true;
    world.emit('portDeflect', { x: bullet.cx, y: bullet.cy });
  }
}

function playerBulletsVsBoss(world) {
  const { boss } = world;
  if (!boss?.vulnerable) return;
  for (const bullet of world.playerBullets) {
    if (bullet.dead) continue;
    const hit = boss.hitTest(bullet);
    if (!hit) continue;
    bullet.dead = true;
    if (hit === HIT.ARMOR) {
      world.emit('armorHit', { x: bullet.cx, y: bullet.cy });
    } else {
      world.recordHit();
      world.emit('bossHit', { x: bullet.cx, y: bullet.cy });
      world.hitBoss(bullet.damage, bullet);
    }
  }
}

function enemyBulletsVsPlayer(world) {
  const { player } = world;
  const core = player.hitbox(HITBOX.PLAYER_VS_BULLET);
  for (const bullet of world.enemyBullets) {
    if (bullet.dead || !overlaps(bullet, core)) continue;
    bullet.dead = true;
    if (player.shielded) world.emit('shieldBlock', { x: bullet.cx, y: bullet.cy });
    else world.damagePlayer(bullet.damage);
  }
}

function enemiesVsPlayer(world) {
  const body = world.player.hitbox(HITBOX.PLAYER_VS_ENEMY);
  for (const enemy of world.enemies) {
    if (enemy.dead || !overlaps(enemy, body)) continue;
    world.hitEnemy(enemy, Infinity);
    world.damagePlayer(COMBAT.ENEMY_CONTACT_DAMAGE);
  }
}

function bossVsPlayer(world) {
  const { boss, player } = world;
  if (boss?.vulnerable && boss.collides(player.hitbox(HITBOX.PLAYER_VS_BOSS))) {
    world.damagePlayer(COMBAT.BOSS_CONTACT_DAMAGE);
  }
}

function powerUpsVsPlayer(world) {
  for (const powerUp of world.powerUps) {
    if (powerUp.dead || !overlaps(powerUp, world.player)) continue;
    powerUp.dead = true;
    world.collectPowerUp(powerUp);
  }
}
