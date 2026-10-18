/** Estado del teclado: `isDown` para acciones continuas, `consume` para pulsaciones únicas. */
export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();

    target.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
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
}

// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
