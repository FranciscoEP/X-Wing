import { BOSS, BULLET, CANVAS } from '../../config.js';
import { centerOf, overlaps } from '../../core/utils.js';
import { interceptAngle } from '../ai/aim.js';
import { Bullet } from '../entities/Bullet.js';
import { Boss, HIT } from './Boss.js';

const DRIFT = { AMPLITUDE: 60, FREQ: 0.4 };

/**
 * Partes del Destructor Estelar. Posición (u, v) relativa al casco (0..1) y tamaño en unidades.
 * Las torretas se destruyen primero; el puente está blindado hasta que caen las tres.
 * `hp` se multiplica por la dificultad (bossHp).
 */
export const PART = {
  FAN: { id: 'FAN', label: 'Torreta de abanico', u: 0.32, v: 0.5, w: 40, h: 40, hp: 200, turret: true },
  BURST: { id: 'BURST', label: 'Torreta de ráfaga', u: 0.58, v: 0.34, w: 40, h: 40, hp: 200, turret: true },
  BEAM: { id: 'BEAM', label: 'Cañón de barrido', u: 0.58, v: 0.66, w: 40, h: 40, hp: 220, turret: true },
  HANGAR: { id: 'HANGAR', label: 'Hangar', u: 0.74, v: 0.76, w: 64, h: 30, hp: 150, turret: false },
  BRIDGE: { id: 'BRIDGE', label: 'Puente de mando', u: 0.86, v: 0.5, w: 64, h: 76, hp: 300, turret: false },
};

/** Ataque de cada parte: cada cuánto, cuánto avisa antes y sus parámetros. */
export const ATTACK = {
  FAN: { every: 2.6, charge: 0.5, count: 7, spread: 1.2, speedFactor: 0.8 },
  BURST: { every: 2.2, charge: 0.4, shots: 4, gap: 0.1, speedFactor: 1.15 },
  BEAM: { every: 4, charge: 0.9, sweep: 1.4, arc: 0.6, damage: 20, width: 12, length: 1100 },
  HANGAR: { every: 4.5, charge: 0.6 },
  BRIDGE: { every: 1.4, charge: 0.4, speedFactor: 0.9, size: 5 },
};
export const PART_SCORE = 500;
const ORDER = [PART.FAN, PART.BURST, PART.BEAM, PART.HANGAR, PART.BRIDGE];

/**
 * Destructor Estelar: blanco enorme que se desmonta. El casco es blindaje (los disparos rebotan);
 * solo las partes reciben daño y cada parte destruida apaga su ataque. Al caer las tres torretas
 * queda expuesto el puente de mando: destruirlo vence al jefe. `hp` es la suma de las partes.
 */
export class StarDestroyer extends Boss {
  constructor(difficulty) {
    super('STAR_DESTROYER', { targetX: CANVAS.WIDTH - 540, y: CANVAS.HEIGHT / 2 - 130 }, difficulty);
    this.parts = ORDER.map((cfg, i) => {
      const hp = Math.round(cfg.hp * difficulty.bossHp);
      // Arranques escalonados: no atacan todas a la vez
      return { cfg, id: cfg.id, hp, maxHp: hp, destroyed: false, timer: 1 + i * 0.7, charge: 0, hitFlash: 0 };
    });
    this.maxHp = this.parts.reduce((n, p) => n + p.maxHp, 0);
    this.hp = this.maxHp;
    this.beam = null; // { angle, from, to, t } mientras el cañón de barrido avisa o dispara
    this.partScore = PART_SCORE;
  }

  part(id) {
    return this.parts.find((p) => p.id === id);
  }

  /** El puente solo se puede dañar cuando no queda ninguna torreta. */
  get bridgeExposed() {
    return this.parts.every((p) => !p.cfg.turret || p.destroyed);
  }

  isTargetable(p) {
    return !p.destroyed && (p.id !== 'BRIDGE' || this.bridgeExposed);
  }

  /** Rectángulo de una parte en unidades de simulación. */
  rectOf(p) {
    const { u, v, w, h } = p.cfg;
    return { x: this.x + u * this.width - w / 2, y: this.y + v * this.height - h / 2, width: w, height: h };
  }

  /** Punto al que conviene apuntar: la primera parte que se puede dañar (para pilotos automáticos). */
  get targetPoint() {
    const p = this.parts.find((q) => this.isTargetable(q));
    return p ? centerOf(this.rectOf(p)) : { x: this.cx, y: this.cy };
  }

  behave(dt, world) {
    this.y = CANVAS.HEIGHT / 2 - this.height / 2 + Math.sin(this.age * DRIFT.FREQ) * DRIFT.AMPLITUDE;
    for (const p of this.parts) {
      p.hitFlash -= dt;
      if (!p.destroyed && (p.id !== 'BRIDGE' || this.bridgeExposed)) this.updatePart(p, dt, world);
    }
    this.updateBeam(dt, world);
  }

  /** Cada parte: espera → aviso (`charge` 0..1 para el renderer) → ataque. */
  updatePart(p, dt, world) {
    const atk = ATTACK[p.id];
    if (p.id === 'BEAM' && this.beam) return; // el barrido gestiona su propio ciclo
    if (p.chargeLeft > 0) {
      p.chargeLeft -= dt;
      p.charge = 1 - p.chargeLeft / atk.charge;
      if (p.chargeLeft <= 0) {
        p.charge = 0;
        this.attack(p, world);
      }
      return;
    }
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = atk.every;
      if (p.id === 'BEAM') return this.startBeam(p, world);
      p.chargeLeft = atk.charge;
    }
  }

  attack(p, world) {
    const at = centerOf(this.rectOf(p));
    const atk = ATTACK[p.id];
    switch (p.id) {
      case 'FAN':
        this.fireSpread(world, at.x, at.y, Math.PI, { count: atk.count, spread: atk.spread, speed: BULLET.ENEMY_SPEED * atk.speedFactor, size: 3 });
        break;
      case 'BURST':
        // Ráfaga apuntada: los disparos salen escalonados (ver pendingShots)
        this.pendingShots = Array.from({ length: atk.shots }, (_, i) => ({ delay: i * atk.gap }));
        this.burstFrom = p;
        break;
      case 'HANGAR':
        world.spawnEnemy('TIE_FIGHTER', { x: at.x, y: at.y - 20 });
        world.emit('hangarLaunch', { boss: this });
        break;
      case 'BRIDGE':
        this.fireAt(world, at.x, at.y, { speed: BULLET.ENEMY_SPEED * atk.speedFactor, size: atk.size });
        break;
    }
  }

  update(dt, world) {
    super.update(dt, world);
    if (!this.pendingShots?.length || this.dying) return;
    for (const s of this.pendingShots) s.delay -= dt;
    const due = this.pendingShots.filter((s) => s.delay <= 0);
    this.pendingShots = this.pendingShots.filter((s) => s.delay > 0);
    if (this.burstFrom.destroyed) return void (this.pendingShots = []);
    const at = centerOf(this.rectOf(this.burstFrom));
    for (let i = 0; i < due.length; i++) this.fireAt(world, at.x, at.y, { speed: BULLET.ENEMY_SPEED * ATTACK.BURST.speedFactor });
  }

  // ------------------------------------------------------------ rayo de barrido

  /** Avisa con el cono que va a barrer (apuntado a donde está el jugador) y luego lo recorre. */
  startBeam(p, world) {
    const at = centerOf(this.rectOf(p));
    const center = interceptAngle(at, world.player, BULLET.ENEMY_SPEED * 3, 0);
    const { arc } = ATTACK.BEAM;
    const down = world.player.cy > at.y ? 1 : -1;
    this.beam = { phase: 'charge', t: 0, from: center - (arc / 2) * down, to: center + (arc / 2) * down, angle: center - (arc / 2) * down };
    world.emit('beamCharge', { boss: this });
  }

  updateBeam(dt, world) {
    const beam = this.beam;
    if (!beam) return;
    const p = this.part('BEAM');
    if (p.destroyed) return void (this.beam = null);
    const { charge, sweep } = ATTACK.BEAM;
    beam.t += dt;
    if (beam.phase === 'charge') {
      p.charge = beam.t / charge;
      if (beam.t >= charge) Object.assign(beam, { phase: 'fire', t: 0 });
      return;
    }
    p.charge = 0;
    beam.angle = beam.from + (beam.to - beam.from) * Math.min(1, beam.t / sweep);
    if (this.beamHits(world.player)) world.damagePlayer(ATTACK.BEAM.damage);
    if (beam.t >= sweep) this.beam = null;
  }

  /** Origen del rayo (centro del cañón). */
  get beamOrigin() {
    return centerOf(this.rectOf(this.part('BEAM')));
  }

  /** ¿El rayo, en su ángulo actual, cruza la zona vulnerable del jugador? */
  beamHits(player) {
    if (!this.beam || this.beam.phase !== 'fire' || player.dead) return false;
    const o = this.beamOrigin;
    const dx = Math.cos(this.beam.angle);
    const dy = Math.sin(this.beam.angle);
    const t = (player.cx - o.x) * dx + (player.cy - o.y) * dy;
    if (t < 0 || t > ATTACK.BEAM.length) return false;
    const dist = Math.abs((player.cx - o.x) * dy - (player.cy - o.y) * dx);
    return dist < ATTACK.BEAM.width / 2 + 10;
  }

  // ------------------------------------------------------------ daño

  /** Parte que ocupa `rect` (solo las que se pueden dañar), o null. */
  partAt(rect) {
    return this.parts.find((p) => this.isTargetable(p) && overlaps(rect, this.rectOf(p))) ?? null;
  }

  /**
   * Vista cenital: los láseres vuelan POR ENCIMA del casco, así que solo tocan las partes.
   * Las partes dañables reciben el golpe; el puente blindado lo hace rebotar.
   */
  hitTest(rect) {
    if (this.partAt(rect)) return HIT.DAMAGE;
    const bridge = this.part('BRIDGE');
    if (!bridge.destroyed && overlaps(rect, this.rectOf(bridge))) return HIT.ARMOR;
    return null;
  }

  /** Para chocar sí cuenta todo el casco triangular. */
  collides(rect) {
    const { x: px, y: py } = centerOf(rect);
    if (px < this.x || px > this.x + this.width) return false;
    const halfSpan = ((px - this.x) / this.width) * (this.height / 2);
    return Math.abs(py - this.cy) <= halfSpan + rect.height / 2;
  }

  /** `source` es el proyectil: decide qué parte recibe el daño. Devuelve true si cae el puente. */
  takeDamage(amount, source = null) {
    if (!this.vulnerable) return false;
    const p = source ? this.partAt(source) : this.parts.find((q) => this.isTargetable(q));
    if (!p) return false;
    const dealt = Math.min(amount, p.hp);
    p.hp -= dealt;
    this.hp -= dealt;
    p.hitFlash = 0.06;
    this.hitFlash = 0.06;
    if (p.hp > 0) return false;
    p.destroyed = true;
    if (p.id !== 'BRIDGE') return false;
    this.hp = 0;
    this.dying = true;
    this.deathTimer = BOSS.DEATH_DURATION;
    return true;
  }
}
