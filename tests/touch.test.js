import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CombinedInput } from '../js/core/CombinedInput.js';
import { Input } from '../js/core/Input.js';
import { TouchInput } from '../js/core/TouchInput.js';
import { Player } from '../js/sim/entities/Player.js';
import { FakeEventTarget } from './helpers.js';

const RADIUS = 50;

/** Superficie de 800×450 px en (100, 50) de la página. */
class FakeSurface extends FakeEventTarget {
  getBoundingClientRect() {
    return { left: 100, top: 50, width: 800, height: 450 };
  }
}

function pointer(target, type, { id = 1, x = 0, y = 0, pointerType = 'touch' } = {}) {
  const e = Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType });
  target.dispatchEvent(e);
  return e;
}

function setup() {
  const surface = new FakeSurface();
  const fire = new FakeEventTarget();
  const torpedo = new FakeEventTarget();
  const touch = new TouchInput({ surface, fire, torpedo, radius: RADIUS });
  return { surface, fire, torpedo, touch };
}

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

describe('TouchInput', () => {
  it('sin toques devuelve controles neutros', () => {
    const { touch } = setup();
    assert.deepEqual(touch.readControls(), { moveX: 0, moveY: 0, shoot: false, torpedo: false });
  });

  it('el joystick mide el arrastre desde donde empezó el toque', () => {
    const { surface, touch } = setup();
    pointer(surface, 'pointerdown', { x: 300, y: 300 });
    pointer(surface, 'pointermove', { x: 325, y: 300 });
    assert.deepEqual(touch.readControls(), { moveX: 0.5, moveY: 0, shoot: false, torpedo: false });
    pointer(surface, 'pointermove', { x: 300, y: 260 });
    near(touch.readControls().moveY, -0.8);
  });

  it('el eje se limita al círculo unidad, también en diagonal', () => {
    const { surface, touch } = setup();
    pointer(surface, 'pointerdown', { x: 300, y: 300 });
    pointer(surface, 'pointermove', { x: 500, y: 300 });
    assert.equal(touch.readControls().moveX, 1);
    pointer(surface, 'pointermove', { x: 400, y: 400 });
    const { moveX, moveY } = touch.readControls();
    near(Math.hypot(moveX, moveY), 1);
    near(moveX, Math.SQRT1_2);
  });

  it('una zona muerta ignora temblores pequeños del dedo', () => {
    const { surface, touch } = setup();
    pointer(surface, 'pointerdown', { x: 300, y: 300 });
    pointer(surface, 'pointermove', { x: 304, y: 303 });
    assert.deepEqual(touch.readControls(), { moveX: 0, moveY: 0, shoot: false, torpedo: false });
  });

  it('al levantar o cancelar el dedo el joystick vuelve al centro', () => {
    const { surface, touch } = setup();
    for (const end of ['pointerup', 'pointercancel']) {
      pointer(surface, 'pointerdown', { x: 300, y: 300 });
      pointer(surface, 'pointermove', { x: 340, y: 300 });
      pointer(surface, end);
      assert.equal(touch.readControls().moveX, 0, end);
    }
  });

  it('solo la mitad izquierda del visor activa el joystick', () => {
    const { surface, touch } = setup();
    pointer(surface, 'pointerdown', { x: 600, y: 300 }); // 500 px dentro de un visor de 800
    pointer(surface, 'pointermove', { x: 650, y: 300 });
    assert.equal(touch.readControls().moveX, 0);
  });

  it('otro dedo no mueve el joystick que ya está en uso', () => {
    const { surface, touch } = setup();
    pointer(surface, 'pointerdown', { id: 1, x: 300, y: 300 });
    pointer(surface, 'pointerdown', { id: 2, x: 200, y: 200 });
    pointer(surface, 'pointermove', { id: 2, x: 400, y: 200 });
    pointer(surface, 'pointerup', { id: 2 });
    assert.equal(touch.readControls().moveX, 0);
    pointer(surface, 'pointermove', { id: 1, x: 275, y: 300 });
    assert.equal(touch.readControls().moveX, -0.5);
  });

  it('el ratón no maneja los controles táctiles', () => {
    const { surface, fire, touch } = setup();
    pointer(surface, 'pointerdown', { x: 300, y: 300, pointerType: 'mouse' });
    pointer(surface, 'pointermove', { x: 340, y: 300, pointerType: 'mouse' });
    pointer(fire, 'pointerdown', { id: 2, pointerType: 'mouse' });
    assert.deepEqual(touch.readControls(), { moveX: 0, moveY: 0, shoot: false, torpedo: false });
  });

  it('disparar dura lo que dura la pulsación', () => {
    const { fire, touch } = setup();
    const down = pointer(fire, 'pointerdown', { id: 3 });
    assert.ok(down.defaultPrevented, 'evita el ratón emulado y la selección');
    assert.ok(touch.readControls().shoot);
    assert.ok(touch.readControls().shoot, 'sigue disparando mientras se mantiene');
    pointer(fire, 'pointerup', { id: 3 });
    assert.ok(!touch.readControls().shoot);
  });

  it('el torpedo se lanza una vez por pulsación', () => {
    const { torpedo, touch } = setup();
    pointer(torpedo, 'pointerdown', { id: 4 });
    assert.ok(touch.readControls().torpedo);
    assert.ok(!touch.readControls().torpedo, 'mantener pulsado no lanza otro');
  });

  it('una pulsación de torpedo que nadie leyó se descarta al acabar el frame', () => {
    const { torpedo, touch } = setup();
    pointer(torpedo, 'pointerdown');
    touch.endFrame();
    assert.ok(!touch.readControls().torpedo);
  });

  it('joystick y botones funcionan a la vez (multitáctil)', () => {
    const { surface, fire, touch } = setup();
    pointer(surface, 'pointerdown', { id: 1, x: 300, y: 300 });
    pointer(surface, 'pointermove', { id: 1, x: 300, y: 350 });
    pointer(fire, 'pointerdown', { id: 2 });
    assert.deepEqual(touch.readControls(), { moveX: 0, moveY: 1, shoot: true, torpedo: false });
  });

  it('reset suelta todo (p. ej. al perder el foco)', () => {
    const { surface, fire, touch } = setup();
    pointer(surface, 'pointerdown', { id: 1, x: 300, y: 300 });
    pointer(surface, 'pointermove', { id: 1, x: 350, y: 300 });
    pointer(fire, 'pointerdown', { id: 2 });
    touch.reset();
    assert.deepEqual(touch.readControls(), { moveX: 0, moveY: 0, shoot: false, torpedo: false });
  });

  it('bloquea el menú contextual de la pulsación larga', () => {
    const { surface } = setup();
    const e = new Event('contextmenu', { cancelable: true });
    surface.dispatchEvent(e);
    assert.ok(e.defaultPrevented);
  });
});

describe('CombinedInput', () => {
  function combined() {
    const keys = new FakeEventTarget();
    const keyboard = new Input(keys);
    const { surface, fire, torpedo } = setup();
    const touch = new TouchInput({ surface, fire, torpedo, radius: RADIUS });
    return { keys, surface, fire, torpedo, input: new CombinedInput(keyboard, touch) };
  }

  it('suma los ejes de teclado y táctil sin pasar de -1..1', () => {
    const { keys, surface, input } = combined();
    pointer(surface, 'pointerdown', { x: 300, y: 300 });
    pointer(surface, 'pointermove', { x: 325, y: 300 });
    assert.equal(input.readControls().moveX, 0.5);
    keys.key('keydown', 'KeyD');
    assert.equal(input.readControls().moveX, 1, 'se limita a 1');
    keys.key('keydown', 'KeyA');
    keys.key('keyup', 'KeyD');
    assert.equal(input.readControls().moveX, -0.5, 'teclado a la izquierda + joystick a la derecha');
  });

  it('dispara si cualquiera de las dos fuentes lo pide', () => {
    const { keys, fire, input } = combined();
    keys.key('keydown', 'Space');
    assert.ok(input.readControls().shoot);
    keys.key('keyup', 'Space');
    assert.ok(!input.readControls().shoot);
    pointer(fire, 'pointerdown');
    assert.ok(input.readControls().shoot);
  });

  it('un torpedo de cada fuente se lee una sola vez', () => {
    const { keys, torpedo, input } = combined();
    keys.key('keydown', 'KeyK');
    pointer(torpedo, 'pointerdown');
    assert.ok(input.readControls().torpedo);
    assert.ok(!input.readControls().torpedo, 'ninguna fuente guarda la pulsación');
  });

  it('delega isDown, consume y endFrame en las fuentes que los tienen', () => {
    const { keys, torpedo, input } = combined();
    keys.key('keydown', 'KeyP');
    assert.ok(input.isDown(['KeyP']));
    assert.ok(input.consume(['KeyP']));
    assert.ok(!input.consume(['KeyP']));
    keys.key('keydown', 'Enter');
    pointer(torpedo, 'pointerdown');
    input.endFrame();
    assert.ok(!input.consume(['Enter']));
    assert.ok(!input.readControls().torpedo);
  });
});

describe('Player con joystick analógico', () => {
  const tick = (player, seconds, controls) => {
    for (let t = 0; t < seconds; t += 1 / 60) player.update(1 / 60, controls);
  };

  it('una diagonal parcial no se frena más de la cuenta', () => {
    const half = new Player(3);
    const halfDiagonal = new Player(3);
    tick(half, 0.1, { moveX: 0.5, moveY: 0 });
    tick(halfDiagonal, 0.1, { moveX: 0.5 * Math.SQRT1_2, moveY: 0.5 * Math.SQRT1_2 });
    near(Math.hypot(halfDiagonal.vx, halfDiagonal.vy), Math.hypot(half.vx, half.vy));
  });
});
