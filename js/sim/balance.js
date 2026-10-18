import { DIFFICULTIES } from '../config.js';
import { EventBus } from '../core/EventBus.js';
import { resetRandomSource, seeded, setRandomSource } from '../core/random.js';
import { ExpertPilot } from './ai/ExpertPilot.js';
import { OUTCOME, World } from './World.js';

const DT = 1 / 60;
const MAX_SECONDS = 1200;

/**
 * Juega una partida completa sin navegador con el piloto experto y devuelve sus métricas.
 * Determinista: misma semilla + misma dificultad + mismo piloto = mismo resultado.
 */
export function playGame({ difficulty, seed, pilot = {} }) {
  setRandomSource(seeded(seed));
  try {
    const world = new World({ difficulty: DIFFICULTIES[difficulty], events: new EventBus() });
    const bot = new ExpertPilot({ seed: seed * 7919, ...pilot });
    let deathPhase = null;
    world.events.on('playerDestroyed', () => (deathPhase ??= world.phases.number));
    world.start(0);
    for (let i = 0; i < MAX_SECONDS / DT && !world.isOver; i++) world.update(DT, bot.decide(world, DT));
    return {
      won: world.outcome === OUTCOME.VICTORY,
      phase: Math.min(world.phases.number, world.phases.total),
      firstDeathPhase: deathPhase,
      time: world.stats.time,
      damage: world.stats.damageTaken,
      livesLost: DIFFICULTIES[difficulty].lives - Math.max(0, world.player.lives),
      score: world.score,
    };
  } finally {
    resetRandomSource();
  }
}

/** Resume N partidas por dificultad: tasa de victoria, fase media alcanzada, etc. */
export function benchmark({ difficulties = Object.keys(DIFFICULTIES), seeds = 20, firstSeed = 1, pilot } = {}) {
  return Object.fromEntries(
    difficulties.map((difficulty) => {
      const games = Array.from({ length: seeds }, (_, i) => playGame({ difficulty, seed: firstSeed + i, pilot }));
      const avg = (f) => games.reduce((n, g) => n + f(g), 0) / games.length;
      return [
        difficulty,
        {
          games: games.length,
          winRate: avg((g) => (g.won ? 1 : 0)),
          avgPhase: avg((g) => g.phase),
          avgDamage: avg((g) => g.damage),
          avgLivesLost: avg((g) => g.livesLost),
          avgTime: avg((g) => g.time),
          // Fase en la que se perdió cada partida (para ver dónde está el muro de dificultad)
          defeatsByPhase: games.filter((g) => !g.won).reduce((acc, g) => ({ ...acc, [g.phase]: (acc[g.phase] ?? 0) + 1 }), {}),
        },
      ];
    })
  );
}
