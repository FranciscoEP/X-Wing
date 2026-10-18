import { random } from './random.js';

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const rand = (min, max) => min + random() * (max - min);

export const centerOf = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Rectángulo reducido `inset` px por cada lado (hitboxes más justas). */
export const shrink = (r, inset) => ({ x: r.x + inset, y: r.y + inset, width: r.width - inset * 2, height: r.height - inset * 2 });

/**
 * Colisión AABB. Para hitboxes más justas reduce SOLO el objetivo con `shrink`:
 * aplicar el margen a ambos rectángulos hacía que un láser de 3 px nunca tocara al jugador.
 */
export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Elige una clave de `table` con probabilidad proporcional a su `weight`. */
export function weightedPick(table) {
  const entries = Object.entries(table);
  const total = entries.reduce((sum, [, v]) => sum + v.weight, 0);
  let roll = random() * total;
  for (const [key, v] of entries) {
    roll -= v.weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** Elige un elemento de `list` con probabilidad proporcional a su `weight` (1 si no tiene). */
export function weightedChoice(list) {
  const total = list.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let roll = random() * total;
  for (const item of list) {
    roll -= item.weight ?? 1;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

/** Elimina en sitio los elementos que no cumplen el predicado (sin crear arrays nuevos). */
export function prune(list, keep) {
  let w = 0;
  for (let r = 0; r < list.length; r++) {
    if (keep(list[r])) list[w++] = list[r];
  }
  list.length = w;
}
