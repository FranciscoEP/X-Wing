// localStorage puede no estar disponible (modo privado, permisos); nunca debe romper el juego.
export function load(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* sin persistencia */
  }
}
