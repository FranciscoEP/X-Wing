import { CANVAS } from '../../config.js';
import { clamp, rand } from '../../core/utils.js';

const SAFETY_MARGIN = 6; // px extra alrededor del casco al juzgar si un láser lo alcanza
const DAMPING = 5;
const EDGE = 20;

/**
 * Esquiva de láseres: mira las balas del jugador que llegarán en menos de `reaction` segundos
 * a la altura de su casco y, con cierta probabilidad, se aparta en vertical.
 * Mantiene su propio desplazamiento (`offset`), que el movimiento base suma a su trayectoria.
 */
export class Evasion {
  constructor({ chance, reaction, speed, cooldown }, difficultyFactor = 1) {
    this.chance = chance * difficultyFactor;
    this.reaction = reaction;
    this.speed = speed;
    this.cooldownTime = cooldown;
    this.cooldown = 0;
    this.offset = 0;
    this.velocity = 0;
  }

  /** Primer láser que impactará a `ship` (con hitbox {x,y,width,height}) dentro del tiempo de reacción. */
  incomingThreat(ship, bullets) {
    for (const b of bullets) {
      if (b.dead || b.vx <= 0 || b.x > ship.x + ship.width) continue;
      const t = (ship.x - (b.x + b.width)) / b.vx;
      if (t < 0 || t > this.reaction) continue;
      const y = b.cy + b.vy * t;
      if (y >= ship.y - SAFETY_MARGIN && y <= ship.y + ship.height + SAFETY_MARGIN) return { bullet: b, y };
    }
    return null;
  }

  /** Devuelve true si inició una maniobra este frame. */
  update(dt, ship, bullets) {
    this.cooldown -= dt;
    this.offset += this.velocity * dt;
    this.velocity *= Math.exp(-DAMPING * dt);

    if (this.cooldown > 0) return false;
    const threat = this.incomingThreat(ship, bullets);
    if (!threat) return false;

    // Se decide una vez por amenaza: si no esquiva, espera antes de volver a intentarlo.
    this.cooldown = this.cooldownTime;
    if (rand(0, 1) >= this.chance) return false;

    const away = threat.y < ship.y + ship.height / 2 ? 1 : -1;
    // Si está pegado a un borde, esquiva hacia el centro
    const nearTop = ship.y < EDGE + ship.height;
    const nearBottom = ship.y > CANVAS.HEIGHT - EDGE - ship.height * 2;
    const dir = nearTop ? 1 : nearBottom ? -1 : away;
    this.velocity = dir * this.speed;
    return true;
  }

  /**
   * Limita el desplazamiento para que la esquiva no saque la nave de pantalla. Un desplazamiento
   * 0 siempre es válido: así no se altera la entrada de naves que vienen desde fuera (tenaza).
   */
  clampTo(pathY, height) {
    const min = EDGE - pathY;
    const max = CANVAS.HEIGHT - EDGE - height - pathY;
    this.offset = clamp(this.offset, Math.min(0, min), Math.max(0, max));
  }
}
