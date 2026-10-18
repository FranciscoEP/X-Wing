/**
 * Puntería predictiva: ángulo para que una bala de rapidez `speed` disparada desde `from`
 * intercepte a `target`, que se mueve con velocidad (vx, vy).
 *
 * `lead` (0..1) controla cuánto se anticipa: 0 apunta a la posición actual y 1 calcula la
 * intercepción exacta. Así la dificultad gradúa la puntería sin cambiar el algoritmo.
 */
export function interceptAngle(from, target, speed, lead = 1) {
  const dx = target.cx - from.x;
  const dy = target.cy - from.y;
  const vx = (target.vx ?? 0) * lead;
  const vy = (target.vy ?? 0) * lead;

  const t = interceptTime(dx, dy, vx, vy, speed);
  if (t === null) return Math.atan2(dy, dx);
  return Math.atan2(dy + vy * t, dx + vx * t);
}

/** Menor t > 0 con |d + v·t| = speed·t, o null si la bala no puede alcanzarlo. */
export function interceptTime(dx, dy, vx, vy, speed) {
  const a = vx * vx + vy * vy - speed * speed;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;
  if (Math.abs(a) < 1e-9) return b < 0 ? -c / b : null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const roots = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].filter((t) => t > 0);
  return roots.length ? Math.min(...roots) : null;
}
