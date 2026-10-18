import { CANVAS } from '../../config.js';

export const MAX_WAVES = 4;

/**
 * Convierte ondas en px lógicos ({ x, y, radius, strength }) al formato del shader:
 * vec4(u, v, radio en altos de pantalla, fuerza), con v invertida (WebGL cuenta desde abajo).
 * Se quedan las MAX_WAVES más fuertes.
 */
export function packWaves(waves) {
  const chosen = [...waves].sort((a, b) => b.strength - a.strength).slice(0, MAX_WAVES);
  const data = new Float32Array(MAX_WAVES * 4);
  chosen.forEach((w, i) => {
    data.set([w.x / CANVAS.WIDTH, 1 - w.y / CANVAS.HEIGHT, w.radius / CANVAS.HEIGHT, w.strength], i * 4);
  });
  return { data, count: chosen.length };
}
