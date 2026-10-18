import { clamp } from './utils.js';

/**
 * Junta varias fuentes de input (teclado, táctil…) bajo la interfaz que usa Game:
 * `isDown`, `consume`, `endFrame` y `readControls`. Una fuente puede implementar solo parte.
 */
export class CombinedInput {
  constructor(...sources) {
    this.sources = sources;
  }

  isDown(codes) {
    return this.sources.some((s) => s.isDown?.(codes));
  }

  /** Consume en todas las fuentes (sin cortocircuito) para que ninguna guarde la pulsación. */
  consume(codes) {
    return this.sources.map((s) => s.consume?.(codes) ?? false).includes(true);
  }

  endFrame() {
    this.sources.forEach((s) => s.endFrame?.());
  }

  /** Suma los ejes (limitados a -1..1) y combina las acciones con OR. */
  readControls() {
    const all = this.sources.filter((s) => s.readControls).map((s) => s.readControls());
    const sum = (key) => clamp(all.reduce((acc, c) => acc + (c[key] ?? 0), 0), -1, 1);
    return {
      moveX: sum('moveX'),
      moveY: sum('moveY'),
      shoot: all.some((c) => c.shoot),
      torpedo: all.some((c) => c.torpedo),
    };
  }
}
