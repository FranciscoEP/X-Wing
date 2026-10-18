import { DeathStar } from './DeathStar.js';
import { StarDestroyer } from './StarDestroyer.js';
import { TieAdvanced } from './TieAdvanced.js';

export function createBoss(type, difficulty, images) {
  switch (type) {
    case 'TIE_ADVANCED':
      return new TieAdvanced(difficulty, images.tie);
    case 'STAR_DESTROYER':
      return new StarDestroyer(difficulty);
    case 'DEATH_STAR':
      return new DeathStar(difficulty);
    default:
      throw new Error(`Jefe desconocido: ${type}`);
  }
}
