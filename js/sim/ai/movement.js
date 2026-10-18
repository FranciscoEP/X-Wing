import { CANVAS } from '../../config.js';
import { rand } from '../../core/utils.js';

/**
 * Patrones de vuelo. Cada uno es un objeto con `update(enemy, dt, world)` que mueve `enemy.x`
 * y devuelve la altura de su trayectoria (sin contar la esquiva, que se suma aparte).
 */

/** Avanza en línea recta ondulando. `phase` sincroniza (o desfasa) la onda entre compañeros. */
export function cruise({ baseY, phase = rand(0, Math.PI * 2), wobble, freq = 2 }) {
  let t = phase;
  return {
    name: 'cruise',
    update(enemy, dt) {
      t += dt;
      enemy.x -= enemy.speed * dt;
      return baseY + Math.sin(t * freq) * wobble;
    },
  };
}

/** Entra por arriba o por abajo y converge hacia `targetY` mientras avanza (tenaza). */
export function pincer({ startY, targetY, ease = 1.6, forwardFactor = 0.7 }) {
  let y = startY;
  return {
    name: 'pincer',
    update(enemy, dt) {
      enemy.x -= enemy.speed * forwardFactor * dt;
      y += (targetY - y) * (1 - Math.exp(-ease * dt));
      return y;
    },
  };
}

/**
 * Picada: se acerca hasta `diveX`, fija la posición del jugador y se lanza hacia ella a gran
 * velocidad; luego sigue de largo hasta salir de la pantalla.
 */
export function dive({ baseY, diveX, diveSpeedFactor = 2.4 }) {
  let state = 'approach';
  let y = baseY;
  let vx = 0;
  let vy = 0;
  return {
    name: 'dive',
    get state() {
      return state;
    },
    update(enemy, dt, world) {
      if (state === 'approach') {
        enemy.x -= enemy.speed * dt;
        if (enemy.x <= diveX) {
          const { player } = world;
          const dx = player.cx - enemy.cx;
          const dy = player.cy - enemy.cy;
          const len = Math.hypot(dx, dy) || 1;
          const speed = enemy.speed * diveSpeedFactor;
          vx = (dx / len) * speed;
          vy = (dy / len) * speed;
          // Nunca hacia atrás: la picada siempre avanza hacia la izquierda
          vx = Math.min(vx, -enemy.speed);
          state = 'dive';
          world.emit('enemyDive', { enemy });
        }
        return y;
      }
      enemy.x += vx * dt;
      y += vy * dt;
      return y;
    },
  };
}

export const SPAWN_X = CANVAS.WIDTH + 10;
