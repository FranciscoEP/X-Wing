export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));

/** Colisión AABB con un margen interno opcional (hitboxes más justas). */
export function overlaps(a, b, inset = 0) {
  return (
    a.x + inset < b.x + b.width - inset &&
    a.x + a.width - inset > b.x + inset &&
    a.y + inset < b.y + b.height - inset &&
    a.y + a.height - inset > b.y + inset
  );
}

export function weightedPick(table) {
  const entries = Object.entries(table);
  const total = entries.reduce((sum, [, v]) => sum + v.weight, 0);
  let roll = Math.random() * total;
  for (const [key, v] of entries) {
    roll -= v.weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** Elimina en sitio los elementos que no cumplen el predicado (sin crear arrays nuevos). */
export function prune(list, keep) {
  let w = 0;
  for (let r = 0; r < list.length; r++) {
    if (keep(list[r])) list[w++] = list[r];
  }
  list.length = w;
}
