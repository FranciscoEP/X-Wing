import { CANVAS, HITBOX, MINE, PLAYER, TORPEDO } from '../../config.js';
import { seeded } from '../../core/random.js';
import { centerOf, clamp, distance } from '../../core/utils.js';
import { ATTACK as SD_ATTACK } from '../bosses/StarDestroyer.js';
import { LOCK_STATE, VADER_MODE } from '../bosses/TieAdvanced.js';

/**
 * Piloto automático "experto" para medir la dificultad (tools/balance.js, tests/balance.test.js).
 * Juega sin trampas: recibe el mismo `world` que vería la pantalla y devuelve los mismos
 * controles que el teclado ({ moveX, moveY, shoot, torpedo }).
 *
 * Cada `reaction` segundos evalúa 9 maniobras (las 8 direcciones y quedarse quieto): predice
 * dónde estaría la nave y dónde estarían las amenazas durante `lookahead` segundos, y elige la
 * que combina menos peligro con mejor posición para disparar. Entre decisiones mantiene la
 * última maniobra, como haría una persona.
 */
export const PILOT_DEFAULTS = {
  reaction: 0.1, // s entre decisiones
  lookahead: 0.7, // s que mira hacia delante
  step: 0.05, // resolución de la predicción
  margin: 6, // px extra de seguridad alrededor de la zona vulnerable
  preferredX: 140, // distancia a la que le gusta volar respecto al borde izquierdo
  // Imperfecciones humanas (0 = piloto perfecto)
  attention: Infinity, // cuántas balas (las más cercanas) puede seguir a la vez
  noise: 0, // px de error al estimar dónde está cada bala
  mistakes: 0, // probabilidad de elegir una maniobra al azar en una decisión
  seed: 1, // semilla propia: no consume la aleatoriedad del juego
};

/**
 * Perfiles de referencia para medir la dificultad. Son supuestos razonables, no datos reales:
 * para ajustarlos de verdad haría falta registrar partidas de personas (telemetría).
 */
export const PILOT_PROFILES = {
  GOOD: { reaction: 0.25, attention: 8, noise: 10, mistakes: 0.03 },
  AVERAGE: { reaction: 0.4, attention: 5, noise: 20, mistakes: 0.08 },
};

const MOVES = [-1, 0, 1].flatMap((moveX) => [-1, 0, 1].map((moveY) => ({ moveX, moveY })));
const WEIGHTS = { danger: 1000, align: 1, xDrift: 0.3, edge: 2, switchMove: 15 };
const TORPEDO_CLUSTER = 3;
const ALIGN_TOLERANCE = 12;

export class ExpertPilot {
  constructor(options = {}) {
    this.options = { ...PILOT_DEFAULTS, ...options };
    this.rng = seeded(this.options.seed);
    this.timer = 0;
    this.current = { moveX: 0, moveY: 0 };
    this.perceived = [];
  }

  /** Controles para este frame. Llamar una vez por update con el mismo `dt`. */
  decide(world, dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.options.reaction;
      this.current = this.bestMove(world);
    }
    return { ...this.current, shoot: true, torpedo: this.wantsTorpedo(world) };
  }

  /**
   * Lo que el piloto "ve" de las balas en este momento: solo las `attention` más cercanas y
   * con un error de `noise` px en su posición (se mantiene hasta la siguiente decisión).
   */
  perceive(world) {
    const { attention, noise } = this.options;
    const { player } = world;
    const near = world.enemyBullets
      .filter((b) => !b.dead)
      .sort((a, b) => distance(centerOf(a), centerOf(player)) - distance(centerOf(b), centerOf(player)))
      .slice(0, attention);
    const jitter = () => (this.rng() * 2 - 1) * noise;
    return near.map((b) => ({ x: b.x + jitter(), y: b.y + jitter(), width: b.width, height: b.height, vx: b.vx, vy: b.vy }));
  }

  bestMove(world) {
    this.perceived = this.perceive(world);
    if (this.rng() < this.options.mistakes) return MOVES[Math.floor(this.rng() * MOVES.length)];
    const target = this.targetY(world);
    let best = MOVES[4];
    let bestCost = Infinity;
    for (const move of MOVES) {
      // Cambiar de maniobra tiene un pequeño coste: evita titubear entre dos casi iguales
      const switching = move.moveX !== this.current.moveX || move.moveY !== this.current.moveY;
      const cost = this.evaluate(world, move, target) + (switching ? WEIGHTS.switchMove : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = move;
      }
    }
    return best;
  }

  /**
   * Coste de mantener `move` durante el horizonte: peligro (domina) + posición de tiro.
   * La alineación cuenta la mejor que alcanza en el camino (no la del final): si no, una
   * maniobra que pasa por el objetivo y se pasa de largo parecería peor que quedarse quieto.
   */
  evaluate(world, move, targetY) {
    const { lookahead, step, preferredX } = this.options;
    let danger = 0;
    let align = Infinity;
    let end = null;
    for (const { t, box } of this.trajectory(world.player, move, lookahead, step)) {
      // El peligro inmediato pesa más que el lejano
      danger += this.threatAt(world, box, t) / t;
      align = Math.min(align, Math.abs(box.y + box.height / 2 - targetY));
      end = box;
    }
    const cx = end.x + end.width / 2;
    const edge = Math.max(0, 40 - end.y) + Math.max(0, end.y + end.height - (CANVAS.HEIGHT - 40));
    return danger * WEIGHTS.danger + align * WEIGHTS.align + Math.abs(cx - preferredX) * WEIGHTS.xDrift + edge * WEIGHTS.edge;
  }

  /**
   * Zona vulnerable prevista en cada paso si se mantiene `move`. Integra la misma física que
   * Player.update (aceleración, fricción, límites) partiendo de la velocidad actual: así tiene
   * en cuenta la inercia y no da por hecho que puede frenar o girar al instante.
   */
  trajectory(player, { moveX, moveY }, lookahead, step) {
    const norm = moveX && moveY ? Math.SQRT1_2 : 1;
    const inset = HITBOX.PLAYER_VS_BULLET - this.options.margin;
    const damping = Math.exp(-PLAYER.FRICTION * step);
    const maxX = CANVAS.WIDTH * PLAYER.MAX_X_RATIO - player.width;
    const maxY = CANVAS.HEIGHT - player.height - PLAYER.MARGIN;
    let { x, y, vx, vy } = player;
    const points = [];
    for (let t = step; t <= lookahead + 1e-9; t += step) {
      vx = clamp((vx + moveX * norm * PLAYER.ACCEL * step) * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);
      vy = clamp((vy + moveY * norm * PLAYER.ACCEL * step) * damping, -PLAYER.MAX_SPEED, PLAYER.MAX_SPEED);
      x = clamp(x + vx * step, PLAYER.MARGIN, maxX);
      y = clamp(y + vy * step, PLAYER.MARGIN, maxY);
      points.push({ t, box: { x: x + inset, y: y + inset, width: player.width - inset * 2, height: player.height - inset * 2 } });
    }
    return points;
  }

  /** Suma de amenazas que alcanzarían `box` en el instante `t`. */
  threatAt(world, box, t) {
    let threat = 0;
    for (const b of this.perceived) {
      const bx = b.x + b.vx * t;
      const by = b.y + b.vy * t;
      if (bx < box.x + box.width && bx + b.width > box.x && by < box.y + box.height && by + b.height > box.y) threat += 1;
    }
    for (const e of world.enemies) {
      // Aproximación: el caza sigue su velocidad horizontal actual
      const ex = e.x - e.speed * t;
      if (ex < box.x + box.width && ex + e.width > box.x && e.y < box.y + box.height && e.y + e.height > box.y) threat += 2;
    }
    for (const m of world.mines) threat += this.mineThreat(m, box, t);
    const { boss } = world;
    if (boss && !boss.dying) threat += this.bossThreat(boss, box);
    return threat;
  }

  /** Mina: peligrosa si va a estallar en este instante con la nave dentro del radio, o si la activa. */
  mineThreat(mine, box, t) {
    const mx = mine.cx - MINE.drift * t;
    const d = Math.hypot(box.x + box.width / 2 - mx, box.y + box.height / 2 - mine.cy);
    if (d < MINE.proximity) return 2;
    return d < MINE.radius && mine.timeLeft - t < 0.25 ? 4 : 0;
  }

  bossThreat(boss, box) {
    const inBand = (y, h) => box.y < y + h && box.y + box.height > y;
    if (boss.type === 'TIE_ADVANCED' && (boss.mode === VADER_MODE.WINDUP || boss.mode === VADER_MODE.CHARGE)) {
      return inBand(boss.chargeY, boss.height) && box.x < boss.x + boss.width ? 5 : 0;
    }
    // Mira de Vader: fijada o disparando, el punto marcado es peligroso
    const lock = boss.lock;
    if (lock && (lock.state === LOCK_STATE.LOCKED || lock.state === LOCK_STATE.FIRING)) {
      const d = Math.hypot(box.x + box.width / 2 - lock.x, box.y + box.height / 2 - lock.y);
      if (d < 36) return 5;
    }
    // Rayo de barrido del Destructor: todo el cono marcado es peligroso mientras avisa o dispara
    if (boss.beam) {
      const o = boss.beamOrigin;
      const a = Math.atan2(box.y + box.height / 2 - o.y, box.x + box.width / 2 - o.x);
      const lo = Math.min(boss.beam.from, boss.beam.to) - 0.08;
      const hi = Math.max(boss.beam.from, boss.beam.to) + 0.08;
      if (a >= lo && a <= hi && Math.hypot(box.x - o.x, box.y - o.y) < SD_ATTACK.BEAM.length) return 4;
    }
    // Choque con el casco
    return boss.collides(box) ? 3 : 0;
  }

  /** Altura a la que conviene volar para acertar. */
  targetY(world) {
    const { player, boss } = world;
    // Reparación cerca y con poca vida: ir por ella
    const repair = world.powerUps.find((p) => p.type === 'REPAIR');
    if (repair && player.hpRatio < 0.6) return repair.cy;
    const port = world.trench?.port;
    if (port && !port.destroyed) return port.cy;
    if (boss?.vulnerable) return boss.targetPoint.y;
    const ahead = world.enemies.filter((e) => !e.dead && e.x > player.x + player.width && e.x < CANVAS.WIDTH);
    if (!ahead.length) return CANVAS.HEIGHT / 2;
    ahead.sort((a, b) => a.x - b.x);
    return ahead[0].cy;
  }

  /** Torpedo si hay un grupo de cazas delante o un tiro directo y limpio al jefe. */
  wantsTorpedo(world) {
    const { player, boss } = world;
    if (player.torpedoCount <= 0 || world.torpedoes.length > 0) return false;
    // Trinchera: el puerto solo cae con torpedo
    const port = world.trench?.port;
    if (port && !port.destroyed) return Math.abs(player.cy - port.cy) < ALIGN_TOLERANCE;
    if (world.trench) return false; // guardar torpedos para el puerto
    if (boss?.vulnerable && !boss.shielded) return Math.abs(player.cy - boss.targetPoint.y) < ALIGN_TOLERANCE;
    const front = { x: player.cx + TORPEDO.BLAST_RADIUS, y: player.cy };
    const cluster = world.enemies.filter((e) => !e.dead && distance(front, centerOf(e)) < TORPEDO.BLAST_RADIUS);
    return cluster.length >= TORPEDO_CLUSTER;
  }
}
