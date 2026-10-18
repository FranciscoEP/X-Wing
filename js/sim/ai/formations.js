import { CANVAS, ENEMY_TYPES, FORMATION } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';
import { cruise, dive, pincer, SPAWN_X } from './movement.js';

const BAND = { TOP: 60, BOTTOM: 150 }; // franja vertical donde nace el líder
const V = { DX: 72, DY: 52, WOBBLE_FACTOR: 0.5 };
const COLUMN = { DX: 75, PHASE_STEP: 0.6 };
const PINCER = { X_RATIO: 0.72, DX: 60, SPREAD: 50 };
const DIVE = { DX: 110, DY: 90, MIN_X_RATIO: 0.45, MAX_X_RATIO: 0.65 };

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
};

/** Genera un escuadrón en el mundo y devuelve sus enemigos. */
export function spawnSquadron(world, enemyType, { formation, size }, { fromWave = true } = {}) {
  const layout = LAYOUTS[formation];
  if (!layout) throw new Error(`Formación desconocida: ${formation}`);
  const cfg = ENEMY_TYPES[enemyType];
  return layout(size, cfg, world).map(({ x, y, movement }) =>
    world.spawnEnemy(enemyType, { x, y: movement.name === 'pincer' ? y : clamp(y, 20, CANVAS.HEIGHT - cfg.size - 20), movement, fromWave })
  );
}

export const FORMATIONS = Object.keys(LAYOUTS);
