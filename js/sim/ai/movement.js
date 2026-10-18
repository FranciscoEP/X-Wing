import { CANVAS } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';

const EDGE = 20; // px que una trayectoria deja libres arriba y abajo

/**
 * Patrones de vuelo. Cada uno es un objeto con `update(enemy, dt, world)` que mueve `enemy.x`
 * y devuelve la altura de su trayectoria (sin contar la esquiva, que se suma aparte).
 */

/**
 * Avanza en línea recta ondulando. `phase` sincroniza (o desfasa) la onda entre compañeros.
 * `drift` (px/s) desplaza la altura base mientras avanza, sin salir de la pantalla.
 */
export function cruise({ baseY, phase = rand(0, Math.PI * 2), wobble, freq = 2, drift = 0 }) {
  let t = phase;
  let y = baseY;
  return {
    name: 'cruise',
    update(enemy, dt) {
      t += dt;
      enemy.x -= enemy.speed * dt;
      if (drift) y = clamp(y + drift * dt, EDGE + wobble, CANVAS.HEIGHT - enemy.height - EDGE - wobble);
      return y + Math.sin(t * freq) * wobble;
    },
  };
}

/**
 * Hostigamiento: entra hasta `holdX`, se queda ahí `holdTime` segundos siguiendo con retraso la
 * altura del jugador (más `lane`, para que los compañeros no se apilen) y luego se retira por
 * la derecha. `retreat()` adelanta la retirada.
 */
export function strafe({ baseY, holdX, holdTime, lane = 0, track = 1.6, sway = 14, retreatFactor = 1.4 }) {
  let state = 'approach';
  let y = baseY;
  let timer = holdTime;
  let t = 0; // el vaivén arranca en 0: sin saltos al detenerse
  return {
    name: 'strafe',
    get state() {
      return state;
    },
    retreat() {
      // Si aún no ha llegado, llega y se va enseguida: retirarse desde fuera de la pantalla
      // dejaría una nave que nunca entra ni escapa y bloquearía el fin de la oleada.
      if (state === 'approach') timer = 0;
      else state = 'retreat';
    },
    update(enemy, dt, world) {
      if (state === 'approach') {
        enemy.x -= enemy.speed * dt;
        if (enemy.x <= holdX) state = 'hold';
      } else if (state === 'hold') {
        t += dt;
        const target = clamp(world.player.cy - enemy.height / 2 + lane, EDGE, CANVAS.HEIGHT - enemy.height - EDGE);
        y += (target - y) * (1 - Math.exp(-track * dt));
        enemy.x = holdX + Math.sin(t * 1.5) * sway;
        timer -= dt;
        if (timer <= 0) state = 'retreat';
      } else {
        enemy.x += enemy.speed * retreatFactor * dt;
      }
      return y;
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

/**
 * Pasada en diagonal (Interceptor): durante `warn` segundos espera fuera de la pantalla mientras
 * el renderer marca su trayectoria; luego la cruza a gran velocidad y sale por el lado opuesto.
 * La trayectoria pasa por donde estaba el jugador al empezar el aviso: hay que apartarse.
 */
export function slash({ startX, fromTop, warn = 0.7, speedFactor = 2.2 }) {
  let state = 'warn';
  let timer = warn;
  let dir = null;
  let y = 0;
  return {
    name: 'slash',
    get state() {
      return state;
    },
    /** Datos del aviso para el renderer: punto de entrada, dirección y progreso 0..1. */
    get warning() {
      return state === 'warn' && dir ? { ...dir, progress: 1 - timer / warn } : null;
    },
    update(enemy, dt, world) {
      if (!dir) {
        y = fromTop ? -enemy.height - 4 : CANVAS.HEIGHT + 4; // del todo fuera hasta que pase
        enemy.x = startX;
        const dx = world.player.cx - (startX + enemy.width / 2);
        const dy = world.player.cy - (y + enemy.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        dir = { x: startX + enemy.width / 2, y: y + enemy.height / 2, dx: dx / len, dy: dy / len };
      }
      if (state === 'warn') {
        timer -= dt;
        if (timer <= 0) {
          state = 'pass';
          world.emit('enemyPass', { enemy });
        }
        return y;
      }
      const speed = enemy.speed * speedFactor;
      enemy.x += dir.dx * speed * dt;
      y += dir.dy * speed * dt;
      return y;
    },
  };
}

/** Anclada a la pared: se desplaza con la trinchera a `speed` fija, sin cambiar de altura. */
export function scroll({ y, speed }) {
  return {
    name: 'scroll',
    update(enemy, dt) {
      enemy.x -= speed * dt;
      return y;
    },
  };
}

export const SPAWN_X = CANVAS.WIDTH + 10;
