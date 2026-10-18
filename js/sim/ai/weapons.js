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
        const d = enemy.difficulty;
        const speed = BULLET.ENEMY_SPEED * d.bulletSpeed;
        const angle = interceptAngle({ x: enemy.x, y: enemy.cy }, world.player, speed, d.aimLead) + rand(-d.aimError, d.aimError);
        for (let i = 0; i < p.count; i++) {
          const a = angle - p.spread / 2 + (p.spread * i) / (p.count - 1);
          world.spawnEnemyBullet(hostile(enemy.x, enemy.cy, a, speed, d));
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

// Torreta de la trinchera: carga 0,5 s (resplandor) y suelta tres rayos lentos apuntados.
WEAPON_KINDS.TRIO = (p) => {
  let cooldown = rand(p.firstMin, p.firstMax);
  let chargeLeft = 0;
  return {
    kind: 'TRIO',
    get charge() {
      return chargeLeft > 0 ? 1 - chargeLeft / p.charge : 0;
    },
    update(enemy, dt, world) {
      if (chargeLeft > 0) {
        chargeLeft -= dt;
        if (chargeLeft <= 0 && enemy.canFire(world)) {
          const d = enemy.difficulty;
          const speed = BULLET.ENEMY_SPEED * p.speedFactor * d.bulletSpeed;
          const angle = Math.atan2(world.player.cy - enemy.cy, world.player.cx - enemy.cx) + rand(-d.aimError, d.aimError);
          for (let i = 0; i < p.count; i++) {
            const a = angle - p.spread / 2 + (p.spread * i) / (p.count - 1);
            world.spawnEnemyBullet(hostile(enemy.cx, enemy.cy, a, speed, d));
          }
        }
        return;
      }
      cooldown -= dt;
      if (cooldown <= 0 && enemy.canFire(world)) {
        chargeLeft = p.charge;
        cooldown = p.every / enemy.difficulty.enemyFire;
      }
    },
  };
};

/** Bala enemiga con la velocidad y el daño ya ajustados a la dificultad `d`. */
export function hostile(x, y, angle, speed, d, opts = {}) {
  return new Bullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, { damage: BULLET.ENEMY_DAMAGE * d.damage, friendly: false, ...opts });
}

function fireTwin(enemy, world, p) {
  const speed = BULLET.ENEMY_SPEED * p.speedFactor * enemy.difficulty.bulletSpeed;
  // Construidos horizontales a propósito: vy exactamente 0 (no apuntan)
  for (const dy of [-p.gap, p.gap]) {
    world.spawnEnemyBullet(new Bullet(enemy.x, enemy.cy + dy, -speed, 0, { damage: BULLET.ENEMY_DAMAGE * enemy.difficulty.damage, friendly: false }));
  }
  world.emit('enemyTwinShot', { enemy });
}

export function createWeapon(kind) {
  const make = WEAPON_KINDS[kind];
  if (!make) throw new Error(`Arma desconocida: ${kind}`);
  return make(WEAPONS[kind]);
}
