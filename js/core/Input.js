import { KEYS } from '../config.js';

// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const BLOCKED_DEFAULTS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * Estado del teclado: `isDown` para acciones continuas, `consume` para pulsaciones únicas.
 * `target` es inyectable para poder probarlo con un EventTarget cualquiera.
 */
export class Input {
  constructor(target = globalThis.window) {
    this.down = new Set();
    this.pressed = new Set();

    target.addEventListener('keydown', (e) => {
      if (BLOCKED_DEFAULTS.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  isDown(codes) {
    return codes.some((c) => this.down.has(c));
  }

  consume(codes) {
    const hit = codes.some((c) => this.pressed.has(c));
    if (hit) codes.forEach((c) => this.pressed.delete(c));
    return hit;
  }

  endFrame() {
    this.pressed.clear();
  }

  /** Traduce el teclado a los controles abstractos que entiende la simulación. */
  readControls() {
    const axis = (neg, pos) => (this.isDown(pos) ? 1 : 0) - (this.isDown(neg) ? 1 : 0);
    return {
      moveX: axis(KEYS.LEFT, KEYS.RIGHT),
      moveY: axis(KEYS.UP, KEYS.DOWN),
      shoot: this.isDown(KEYS.SHOOT),
      torpedo: this.consume(KEYS.TORPEDO),
    };
  }
}
