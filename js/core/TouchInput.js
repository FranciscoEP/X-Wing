const DEAD_ZONE = 0.15; // fracción del radio del joystick que no mueve la nave
const DEFAULT_RADIUS = 50; // px, si no hay elemento del que medirlo

const isMouse = (e) => e.pointerType === 'mouse';

/** Marca visual del botón pulsado (en iOS `:active` no es fiable en un div). */
function setPressed(el, on) {
  if (!el.dataset) return;
  if (on) el.dataset.pressed = 'true';
  else delete el.dataset.pressed;
}

/**
 * Controles táctiles con eventos `pointer*`, con la misma interfaz que Input.readControls().
 *
 * - Joystick flotante: un toque en la mitad izquierda de `surface` fija el centro y
 *   arrastrar desde ahí da los ejes (-1..1).
 * - `fire` dispara mientras se mantiene pulsado; `torpedo` lanza uno por pulsación.
 *
 * Todos los elementos son inyectables: en las pruebas basta con un EventTarget.
 * `stick` (opcional) es el dibujo del joystick; recibe `data-active` y las variables
 * CSS --ox/--oy (centro) y --kx/--ky (desplazamiento de la palanca), en px del visor.
 */
export class TouchInput {
  constructor({ surface, fire, torpedo, stick = null, radius = null }) {
    this.surface = surface;
    this.stick = stick;
    this.buttons = [fire, torpedo];
    this.radius = radius;
    this.joystick = null; // { id, ox, oy, x, y } mientras hay un dedo en el joystick
    this.firePointers = new Set();
    this.torpedoQueued = false;

    surface.addEventListener('pointerdown', (e) => this.startStick(e));
    surface.addEventListener('pointermove', (e) => this.moveStick(e));
    surface.addEventListener('pointerup', (e) => this.endStick(e));
    surface.addEventListener('pointercancel', (e) => this.endStick(e));
    // Mantener pulsado abre el menú contextual en Android: aquí no tiene sentido
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    fire.addEventListener('pointerdown', (e) => {
      if (isMouse(e)) return;
      e.preventDefault();
      this.firePointers.add(e.pointerId);
      setPressed(fire, true);
    });
    torpedo.addEventListener('pointerdown', (e) => {
      if (isMouse(e)) return;
      e.preventDefault();
      this.torpedoQueued = true;
      setPressed(torpedo, true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      fire.addEventListener(type, (e) => {
        this.firePointers.delete(e.pointerId);
        setPressed(fire, this.firePointers.size > 0);
      });
      torpedo.addEventListener(type, () => setPressed(torpedo, false));
    }

    globalThis.window?.addEventListener('blur', () => this.reset());
  }

  // --------------------------------------------------------------- joystick

  bounds() {
    return this.surface.getBoundingClientRect?.() ?? { left: 0, top: 0, width: Infinity, height: Infinity };
  }

  stickRadius() {
    return this.radius ?? (this.stick?.offsetWidth / 2 || DEFAULT_RADIUS);
  }

  startStick(e) {
    if (this.joystick || isMouse(e)) return;
    const rect = this.bounds();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) return; // la mitad derecha es de los botones
    const y = e.clientY - rect.top;
    this.joystick = { id: e.pointerId, ox: x, oy: y, x, y };
    this.drawStick();
  }

  moveStick(e) {
    if (e.pointerId !== this.joystick?.id) return;
    const rect = this.bounds();
    this.joystick.x = e.clientX - rect.left;
    this.joystick.y = e.clientY - rect.top;
    this.drawStick();
  }

  endStick(e) {
    if (e.pointerId !== this.joystick?.id) return;
    this.joystick = null;
    this.drawStick();
  }

  /** Desplazamiento de la palanca en -1..1, limitado al círculo y con zona muerta. */
  axes() {
    if (!this.joystick) return { x: 0, y: 0 };
    const r = this.stickRadius();
    let x = (this.joystick.x - this.joystick.ox) / r;
    let y = (this.joystick.y - this.joystick.oy) / r;
    const len = Math.hypot(x, y);
    if (len < DEAD_ZONE) return { x: 0, y: 0 };
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  drawStick() {
    if (!this.stick) return;
    const style = this.stick.style;
    if (!this.joystick) {
      delete this.stick.dataset.active;
      ['--ox', '--oy', '--kx', '--ky'].forEach((v) => style.removeProperty(v));
      return;
    }
    const { x, y } = this.axes();
    const r = this.stickRadius();
    this.stick.dataset.active = 'true';
    style.setProperty('--ox', `${this.joystick.ox}px`);
    style.setProperty('--oy', `${this.joystick.oy}px`);
    style.setProperty('--kx', `${x * r}px`);
    style.setProperty('--ky', `${y * r}px`);
  }

  // --------------------------------------------------------------- interfaz común

  reset() {
    this.joystick = null;
    this.firePointers.clear();
    this.torpedoQueued = false;
    this.buttons.forEach((b) => setPressed(b, false));
    this.drawStick();
  }

  /** Como en el teclado, una pulsación que nadie leyó en este frame se descarta. */
  endFrame() {
    this.torpedoQueued = false;
  }

  readControls() {
    const { x, y } = this.axes();
    const torpedo = this.torpedoQueued;
    this.torpedoQueued = false;
    return { moveX: x, moveY: y, shoot: this.firePointers.size > 0, torpedo };
  }
}
