import { CANVAS, ENEMY_TYPES, FORMATION } from '../../config.js';
import { random } from '../../core/random.js';
import { clamp, rand } from '../../core/utils.js';
import { cruise, dive, pincer, SPAWN_X, strafe } from './movement.js';
import { Squadron } from './squadron.js';

const BAND = { TOP: 60, BOTTOM: 150 }; // franja vertical donde nace el líder
const V = { DX: 72, DY: 52, WOBBLE_FACTOR: 0.5 };
const COLUMN = { DX: 75, PHASE_STEP: 0.6 };
const PINCER = { X_RATIO: 0.72, DX: 60, SPREAD: 50 };
const DIVE = { DX: 110, DY: 90, MIN_X_RATIO: 0.45, MAX_X_RATIO: 0.65 };
const ECHELON = { DX: 70, DY: 60, DRIFT: 45, WOBBLE_FACTOR: 0.3 };
const STRAFE = { DX: 90, LANE: 80, MIN_X_RATIO: 0.6, MAX_X_RATIO: 0.82, MIN_HOLD: 3, MAX_HOLD: 5 };

/**
 * Cada formación devuelve la lista de { x, y, movement } de sus miembros.
 * Para añadir una formación: nueva función aquí, registrarla en LAYOUTS y en FORMATION (config.js).
 */
const LAYOUTS = {
  [FORMATION.V]: (size, cfg) => {
    const y0 = rand(BAND.TOP + V.DY * 2, CANVAS.HEIGHT - BAND.BOTTOM - V.DY);
    const phase = rand(0, Math.PI * 2); // misma fase: la V ondula como un bloque
    return Array.from({ length: size }, (_, i) => {
      const rank = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      const y = y0 + side * rank * V.DY;
      return { x: SPAWN_X + rank * V.DX, y, movement: cruise({ baseY: y, phase, wobble: cfg.wobble * V.WOBBLE_FACTOR }) };
    });
  },

  [FORMATION.COLUMN]: (size, cfg) => {
    const y = rand(BAND.TOP + cfg.wobble, CANVAS.HEIGHT - BAND.BOTTOM);
    const phase = rand(0, Math.PI * 2);
    // Fila india con la onda desfasada: avanza como una serpiente
    return Array.from({ length: size }, (_, i) => ({
      x: SPAWN_X + i * COLUMN.DX,
      y,
      movement: cruise({ baseY: y, phase: phase - i * COLUMN.PHASE_STEP, wobble: cfg.wobble }),
    }));
  },

  [FORMATION.PINCER]: (size, cfg, world) => {
    const target = world.player.cy;
    return Array.from({ length: size }, (_, i) => {
      const fromTop = i % 2 === 0;
      const startY = fromTop ? -cfg.size : CANVAS.HEIGHT;
      const lane = Math.floor(i / 2);
      // Limitado a la pantalla: si el jugador está en un borde, el objetivo no puede quedar fuera
      const targetY = clamp(target + (fromTop ? -1 : 1) * (PINCER.SPREAD + lane * PINCER.SPREAD) - cfg.size / 2, 20, CANVAS.HEIGHT - cfg.size - 20);
      return { x: CANVAS.WIDTH * PINCER.X_RATIO + lane * PINCER.DX, y: startY, movement: pincer({ startY, targetY }) };
    });
  },

  [FORMATION.DIVE]: (size) => {
    const center = rand(BAND.TOP + DIVE.DY, CANVAS.HEIGHT - BAND.BOTTOM);
    return Array.from({ length: size }, (_, i) => {
      const y = center + (i - (size - 1) / 2) * DIVE.DY;
      const diveX = rand(CANVAS.WIDTH * DIVE.MIN_X_RATIO, CANVAS.WIDTH * DIVE.MAX_X_RATIO);
      return { x: SPAWN_X + i * DIVE.DX, y, movement: dive({ baseY: y, diveX }) };
    });
  },

  // Escalón: diagonal que sube o baja (al azar) y se desliza hacia la altura del jugador
  [FORMATION.ECHELON]: (size, cfg, world) => {
    const span = (size - 1) * ECHELON.DY;
    const y0 = rand(BAND.TOP, Math.max(BAND.TOP, CANVAS.HEIGHT - BAND.BOTTOM - span));
    const descending = random() < 0.5;
    const drift = Math.sign(world.player.cy - (y0 + span / 2)) * ECHELON.DRIFT;
    const phase = rand(0, Math.PI * 2);
    return Array.from({ length: size }, (_, i) => {
      const y = descending ? y0 + i * ECHELON.DY : y0 + span - i * ECHELON.DY;
      return { x: SPAWN_X + i * ECHELON.DX, y, movement: cruise({ baseY: y, phase, wobble: cfg.wobble * ECHELON.WOBBLE_FACTOR, drift }) };
    });
  },

  // Hostigamiento: se detienen a distancia, siguen al jugador en carriles y luego se retiran
  [FORMATION.STRAFE]: (size) =>
    Array.from({ length: size }, (_, i) => {
      const y = rand(BAND.TOP, CANVAS.HEIGHT - BAND.BOTTOM);
      return {
        x: SPAWN_X + i * STRAFE.DX,
        y,
        movement: strafe({
          baseY: y,
          holdX: CANVAS.WIDTH * rand(STRAFE.MIN_X_RATIO, STRAFE.MAX_X_RATIO),
          holdTime: rand(STRAFE.MIN_HOLD, STRAFE.MAX_HOLD),
          lane: (i - (size - 1) / 2) * STRAFE.LANE,
        }),
      };
    }),
};

/** Genera un escuadrón en el mundo y devuelve sus enemigos (que comparten un `Squadron`). */
export function spawnSquadron(world, enemyType, { formation, size }, { fromWave = true } = {}) {
  const layout = LAYOUTS[formation];
  if (!layout) throw new Error(`Formación desconocida: ${formation}`);
  const cfg = ENEMY_TYPES[enemyType];
  const members = layout(size, cfg, world).map(({ x, y, movement }) =>
    world.spawnEnemy(enemyType, { x, y: movement.name === 'pincer' ? y : clamp(y, 20, CANVAS.HEIGHT - cfg.size - 20), movement, fromWave })
  );
  world.addSquadron(new Squadron(members));
  return members;
}

export const FORMATIONS = Object.keys(LAYOUTS);
