#!/usr/bin/env node
// Mide la dificultad: juega N partidas por dificultad con cada perfil de piloto y muestra métricas.
// Uso: npm run balance -- [partidas=30] [perfiles=GOOD,AVERAGE]
import { PILOT_PROFILES } from '../js/sim/ai/ExpertPilot.js';
import { benchmark } from '../js/sim/balance.js';

const seeds = Number(process.argv[2] ?? 30);
const profiles = (process.argv[3] ?? Object.keys(PILOT_PROFILES).join(',')).split(',');
const started = performance.now();

for (const name of profiles) {
  const results = benchmark({ seeds, pilot: PILOT_PROFILES[name] });
  console.log(`\nPiloto ${name} ${JSON.stringify(PILOT_PROFILES[name])} · ${seeds} partidas por dificultad`);
  console.table(
    Object.fromEntries(
      Object.entries(results).map(([difficulty, r]) => [
        difficulty,
        {
          'victorias %': Math.round(r.winRate * 100),
          'fase media': r.avgPhase.toFixed(2),
          'vidas perdidas': r.avgLivesLost.toFixed(2),
          'daño medio': Math.round(r.avgDamage),
          'tiempo medio (s)': Math.round(r.avgTime),
          'derrotas por fase': Object.entries(r.defeatsByPhase).map(([f, n]) => `F${f}:${n}`).join(' ') || '-',
        },
      ])
    )
  );
}
console.log(`(${((performance.now() - started) / 1000).toFixed(1)} s)`);
