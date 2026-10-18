import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PILOT_PROFILES } from '../js/sim/ai/ExpertPilot.js';
import { benchmark } from '../js/sim/balance.js';

/**
 * Metas de dificultad medidas con el piloto experto (js/sim/ai/ExpertPilot.js).
 * Son deterministas (semillas fijas): si un cambio de balance o de IA las mueve fuera de rango,
 * esta prueba falla. Para ver la tabla completa: `npm run balance`.
 */
const SEEDS = 20;

describe('balance de dificultad', () => {
  const good = benchmark({ seeds: SEEDS, pilot: PILOT_PROFILES.GOOD });
  const average = benchmark({ seeds: SEEDS, difficulties: ['EASY', 'HARD'], pilot: PILOT_PROFILES.AVERAGE });
  const pct = (r) => `${Math.round(r.winRate * 100)}%`;

  it('Fácil: casi cualquiera lo termina', () => {
    assert.ok(good.EASY.winRate >= 0.95, `buen piloto: ${pct(good.EASY)}`);
    assert.ok(average.EASY.winRate >= 0.9, `piloto promedio: ${pct(average.EASY)}`);
  });

  it('Normal: un buen piloto suele ganar, pero pierde vidas', () => {
    assert.ok(good.NORMAL.winRate >= 0.8, `buen piloto: ${pct(good.NORMAL)}`);
    assert.ok(good.NORMAL.avgLivesLost >= 0.5, `vidas perdidas: ${good.NORMAL.avgLivesLost}`);
  });

  it('Difícil: es un reto incluso para un buen piloto', () => {
    assert.ok(good.HARD.winRate >= 0.05 && good.HARD.winRate <= 0.35, `buen piloto: ${pct(good.HARD)}`);
    assert.ok(average.HARD.winRate <= 0.1, `piloto promedio: ${pct(average.HARD)}`);
  });

  it('ritmo: en Difícil la trinchera final es un reto real, no un trámite', () => {
    const trenchDefeats = good.HARD.defeatsByPhase[5] ?? 0;
    assert.ok(trenchDefeats / SEEDS >= 0.2, `derrotas en la trinchera: ${trenchDefeats}/${SEEDS}`);
  });

  it('cada dificultad es más dura que la anterior', () => {
    assert.ok(good.EASY.winRate >= good.NORMAL.winRate && good.NORMAL.winRate > good.HARD.winRate);
    assert.ok(good.EASY.avgLivesLost < good.NORMAL.avgLivesLost);
  });
});
