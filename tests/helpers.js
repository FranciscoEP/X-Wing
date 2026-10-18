import { DIFFICULTIES } from '../js/config.js';
import { EventBus } from '../js/core/EventBus.js';
import { resetRandomSource, seeded, setRandomSource } from '../js/core/random.js';
import { Bullet } from '../js/sim/entities/Bullet.js';
import { PHASE_STATUS } from '../js/sim/PhaseManager.js';
import { World } from '../js/sim/World.js';

export const DT = 1 / 60;
export const NORMAL = DIFFICULTIES.NORMAL;

/** Fija la aleatoriedad para que cada prueba sea reproducible. */
export function useSeed(seed = 42) {
  setRandomSource(seeded(seed));
}
export { resetRandomSource };

/** Mundo con registro de eventos (`world.log`) para hacer aserciones sobre lo emitido. */
export function makeWorld({ difficulty = NORMAL, phase = null } = {}) {
  const events = new EventBus();
  const world = new World({ difficulty, events });
  world.log = [];
  const emit = events.emit.bind(events);
  events.emit = (name, payload) => {
    world.log.push({ name, payload });
    emit(name, payload);
  };
  if (phase !== null) world.start(phase);
  return world;
}

export const emitted = (world, name) => world.log.filter((e) => e.name === name);

/** Avanza `seconds` de simulación; `controls` puede ser objeto o función (world) => controls. */
export function run(world, seconds, controls = {}, { until = () => false } = {}) {
  const steps = Math.ceil(seconds / DT);
  for (let i = 0; i < steps; i++) {
    world.update(DT, typeof controls === 'function' ? controls(world) : controls);
    if (world.isOver || until(world)) return i * DT;
  }
  return seconds;
}

/** Salta el cartel de presentación hasta que la fase esté activa. */
export function skipIntro(world) {
  run(world, 10, {}, { until: (w) => w.phases.status === PHASE_STATUS.ACTIVE });
}

/** Avanza hasta que el jefe termine de entrar y sea vulnerable. */
export function waitBossReady(world) {
  skipIntro(world);
  run(world, 10, {}, { until: (w) => w.boss?.vulnerable });
}

/** Mantiene al jugador inmune (para probar al enemigo sin que la partida termine). */
export const godMode = (world) => {
  world.player.invulnerable = Infinity;
};

export function enemyBulletAt(x, y, vx = -380, vy = 0) {
  return new Bullet(x, y, vx, vy, { damage: 10, friendly: false });
}

export function playerBulletAt(x, y, vx = 900, vy = 0) {
  return new Bullet(x, y, vx, vy, { damage: 10, friendly: true });
}

export class FakeEventTarget extends EventTarget {
  key(type, code) {
    this.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code }));
  }
}
