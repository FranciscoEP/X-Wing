import { BULLET, WEAPONS } from '../../config.js';
import { rand } from '../../core/utils.js';
import { Bullet } from '../entities/Bullet.js';
import { Mine } from '../entities/Mine.js';
import { interceptAngle } from './aim.js';

/**
 * Firmas de ataque: cada tipo de enemigo dispara a su manera y a su propio ritmo.
 * Un arma es un objeto con `update(enemy, dt, world)` y `charge` (0..1), el aviso visible
 * que dibuja el renderer antes de un disparo peligroso (pilar «todo daño es justo»).
 */
export const WEAPON_KINDS = {
  /**
   * TIE Fighter: no apunta. Cuando te tiene enfrente (±align en altura) carga 0,3 s —sus
   * cañones brillan— y dispara dos láseres rectos. Para evitarlo basta con salir de su línea.
   */
  TWIN: (p) => {
    let cooldown = rand(p.cooldownMin, p.cooldownMax);
    let chargeLeft = 0;
    return {
      kind: 'TWIN',
      get charge() {
        return chargeLeft > 0 ? 1 - chargeLeft / p.charge : 0;
      },
      update(enemy, dt, world) {
        if (chargeLeft > 0) {
          chargeLeft -= dt;
          if (!enemy.canFire(world)) chargeLeft = 0; // salió de posición: se cancela
          else if (chargeLeft <= 0) {
            fireTwin(enemy, world, p);
            cooldown = rand(p.cooldownMin, p.cooldownMax) / enemy.difficulty.enemyFire;
          }
          return;
        }
        cooldown -= dt;
        const aligned = Math.abs(world.player.cy - enemy.cy) < p.align;
        if (cooldown <= 0 && aligned && enemy.canFire(world)) {
          chargeLeft = p.charge;
          world.emit('enemyCharge', { enemy });
        }
      },
    };
  },

  /** Interceptor: un abanico de rayos al cruzar tu altura, una vez por pasada. */
  FAN: (p) => {
    let shots = p.shots;
    return {
      kind: 'FAN',
      charge: 0,
      update(enemy, dt, world) {
        if (shots <= 0 || enemy.movement.state === 'warn') return;
        const crossing = Math.abs(world.player.cy - enemy.cy) < p.align;
        if (!crossing || !enemy.canFire(world)) return;
        shots--;
        const angle = interceptAngle({ x: enemy.x, y: enemy.cy }, world.player, BULLET.ENEMY_SPEED, enemy.difficulty.aimLead);
        for (let i = 0; i < p.count; i++) {
          const a = angle - p.spread / 2 + (p.spread * i) / (p.count - 1);
          world.spawnEnemyBullet(new Bullet(enemy.x, enemy.cy, Math.cos(a) * BULLET.ENEMY_SPEED, Math.sin(a) * BULLET.ENEMY_SPEED, { damage: BULLET.ENEMY_DAMAGE, friendly: false }));
        }
      },
    };
  },

  /** TIE Bomber: suelta una mina cada cierto tiempo mientras está por delante del jugador. */
  MINES: (p) => {
    let cooldown = rand(p.firstMin, p.firstMax);
    return {
      kind: 'MINES',
      charge: 0,
      update(enemy, dt, world) {
        cooldown -= dt;
        if (cooldown > 0) return;
        if (!enemy.canFire(world) || enemy.x < world.player.x + p.minDistance) return;
        cooldown = p.every / enemy.difficulty.enemyFire;
        world.spawnMine(new Mine(enemy.cx, enemy.cy + enemy.height / 2));
      },
    };
  },
};

function fireTwin(enemy, world, p) {
  const speed = BULLET.ENEMY_SPEED * p.speedFactor;
  for (const dy of [-p.gap, p.gap]) {
    world.spawnEnemyBullet(new Bullet(enemy.x, enemy.cy + dy, -speed, 0, { damage: BULLET.ENEMY_DAMAGE, friendly: false }));
  }
  world.emit('enemyTwinShot', { enemy });
}

export function createWeapon(kind) {
  const make = WEAPON_KINDS[kind];
  if (!make) throw new Error(`Arma desconocida: ${kind}`);
  return make(WEAPONS[kind]);
}
