import { POWERUPS } from '../config.js';

/**
 * Efectos de cada power-up sobre el jugador. Para añadir uno nuevo: entrada en POWERUPS
 * (config.js) y, si no es un efecto temporal simple, su función aquí.
 */
const timed = (player, type, cfg) => player.grantPowerUp(type, cfg.duration);

export const POWERUP_EFFECTS = {
  TRIPLE_SHOT: timed,
  RAPID_FIRE: timed,
  SHIELD: timed,
  REPAIR: (player, _type, cfg) => player.heal(cfg.heal),
  TORPEDO: (player, _type, cfg) => player.addTorpedoes(cfg.torpedoes),
};

export function applyPowerUp(player, type) {
  const cfg = POWERUPS[type];
  const effect = POWERUP_EFFECTS[type];
  if (!cfg || !effect) throw new Error(`Power-up sin efecto definido: ${type}`);
  effect(player, type, cfg);
  return cfg;
}
