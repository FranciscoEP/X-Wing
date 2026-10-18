import { random } from '../../core/random.js';
import { rand } from '../../core/utils.js';
import { dive } from './movement.js';

/**
 * Disparo coordinado. En vez de que cada nave dispare por su cuenta, el escuadrón decide:
 * - ráfaga: una nave (por turnos) dispara BURST_LEADS.length láseres seguidos, cada uno con más
 *   anticipación que el anterior, que barren la trayectoria del jugador;
 * - andanada: si hay al menos SALVO_MIN naves en posición, todas disparan a la vez a donde está.
 * La cadencia media del escuadrón es la suma de las de sus naves vivas, como antes.
 */
const FIRE = {
  FIRST_MIN: 0.8,
  FIRST_MAX: 1.8,
  BURST_LEADS: [0, 1, 1.6], // × difficulty.aimLead
  BURST_GAP: 0.13,
  SALVO_MIN: 3,
  SALVO_CHANCE: 0.35,
  JITTER: 0.25,
  RETRY: 0.25, // si nadie puede disparar, vuelve a mirar pronto
};

/** Al caer el líder, como mucho estos compañeros rompen la formación y se lanzan en picada. */
const BREAK = { MAX_DIVERS: 2 };

/**
 * Escuadrón: los enemigos de una formación comparten turno de fuego y reaccionan juntos.
 * El líder es el primer miembro (el que va al frente en todas las formaciones).
 */
export class Squadron {
  constructor(members) {
    this.members = members;
    this.leader = members[0];
    this.broken = false;
    this.volleyTimer = rand(FIRE.FIRST_MIN, FIRE.FIRST_MAX);
    this.pending = []; // láseres de ráfaga en espera: { enemy, delay, lead }
    this.turn = 0;
    for (const m of members) m.squadron = this;
  }

  get alive() {
    return this.members.filter((m) => !m.dead);
  }

  get done() {
    return this.members.every((m) => m.dead);
  }

  update(dt, world) {
    if (!this.broken && this.leader.dead && !this.leader.escaped) this.breakFormation(world);
    this.updateFire(dt, world);
  }

  // ------------------------------------------------------------ líder caído

  /**
   * Sin líder, los que vuelan en formación (cruise) más cercanos se lanzan contra el jugador y
   * los que hostigan se retiran. Así derribar primero al líder cambia la oleada.
   */
  breakFormation(world) {
    this.broken = true;
    const survivors = this.alive;
    if (!survivors.length) return;
    const { leader } = this;
    const byDistance = (a, b) => Math.hypot(a.cx - leader.cx, a.cy - leader.cy) - Math.hypot(b.cx - leader.cx, b.cy - leader.cy);
    const divers = survivors
      .filter((m) => m.movement.name === 'cruise')
      .sort(byDistance)
      .slice(0, BREAK.MAX_DIVERS);
    for (const m of divers) m.movement = dive({ baseY: m.pathY, diveX: Infinity });
    for (const m of survivors) m.movement.retreat?.();
    world.emit('squadronBroken', { x: leader.cx, y: leader.cy, divers: divers.length });
  }

  // ------------------------------------------------------------ fuego

  updateFire(dt, world) {
    this.firePending(dt, world);
    this.volleyTimer -= dt;
    if (this.volleyTimer > 0) return;
    const ready = this.alive.filter((m) => m.canFire(world));
    if (!ready.length) {
      this.volleyTimer = FIRE.RETRY;
      return;
    }

    const shots = ready.length >= FIRE.SALVO_MIN && random() < FIRE.SALVO_CHANCE ? this.salvo(world, ready) : this.burst(world, ready);
    const rate = this.alive.reduce((sum, m) => sum + m.fireRate, 0);
    this.volleyTimer = (shots / rate) * rand(1 - FIRE.JITTER, 1 + FIRE.JITTER);
  }

  /** Dispara los láseres de ráfaga cuyo retardo ya pasó (si la nave sigue en posición). */
  firePending(dt, world) {
    for (const shot of this.pending) {
      shot.delay -= dt;
      if (shot.delay <= 0 && !shot.enemy.dead && shot.enemy.canFire(world)) shot.enemy.fireAt(world, { lead: shot.lead });
    }
    this.pending = this.pending.filter((s) => s.delay > 0);
  }

  /** Todas las naves en posición disparan a la vez a la posición actual del jugador. */
  salvo(world, ready) {
    for (const m of ready) m.fireAt(world, { lead: 0 });
    world.emit('squadronSalvo', { count: ready.length });
    return ready.length;
  }

  /** Una nave, por turnos, dispara una ráfaga que anticipa cada vez más. */
  burst(world, ready) {
    const shooter = ready[this.turn++ % ready.length];
    const aimLead = shooter.difficulty.aimLead;
    FIRE.BURST_LEADS.forEach((k, i) => this.pending.push({ enemy: shooter, delay: i * FIRE.BURST_GAP, lead: k * aimLead }));
    this.firePending(0, world); // el primer láser sale ya, sin esperar al siguiente frame
    return FIRE.BURST_LEADS.length;
  }
}
