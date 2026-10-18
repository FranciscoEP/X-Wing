import { DeathStar } from './DeathStar.js';
import { StarDestroyer } from './StarDestroyer.js';
import { TieAdvanced } from './TieAdvanced.js';

/** Para añadir un jefe: crea la clase, regístrala aquí y añade su entrada en BOSS_TYPES (config.js). */
export const BOSS_CLASSES = {
  TIE_ADVANCED: TieAdvanced,
  STAR_DESTROYER: StarDestroyer,
  DEATH_STAR: DeathStar,
};

export function createBoss(type, difficulty) {
  const BossClass = BOSS_CLASSES[type];
  if (!BossClass) throw new Error(`Jefe desconocido: ${type}`);
  return new BossClass(difficulty);
}
