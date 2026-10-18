import { dive } from './movement.js';

/** Al caer el líder, como mucho estos compañeros rompen la formación y se lanzan en picada. */
const BREAK = { MAX_DIVERS: 2 };

/**
 * Escuadrón: los enemigos de una formación reaccionan juntos cuando cae su líder (el primer
 * miembro, el que va al frente). El disparo NO es del escuadrón: cada nave usa su propia arma
 * y su propio ritmo (sim/ai/weapons.js), así no disparan todas a la vez ni con el mismo patrón.
 */
export class Squadron {
  constructor(members) {
    this.members = members;
    this.leader = members[0];
    this.broken = false;
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
  }

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
}
