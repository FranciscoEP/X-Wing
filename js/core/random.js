// Fuente de aleatoriedad reemplazable: en producción es Math.random y en las pruebas
// se sustituye por un generador con semilla para obtener partidas reproducibles.
let source = Math.random;

export const random = () => source();

export function setRandomSource(fn) {
  source = fn;
}

export function resetRandomSource() {
  source = Math.random;
}

/** Generador determinista (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
