import { DIFFICULTIES, PHASE_TYPE, POWERUPS, SCORE } from '../config.js';
import { PHASE_STATUS } from '../sim/PhaseManager.js';

/**
 * Funciones puras que traducen el estado del juego a lo que muestra la interfaz.
 * No tocan el DOM: se prueban en Node (tests/ui.test.js) y CockpitUI solo las pinta.
 */

export const HP_LEVEL = { OK: 'ok', LOW: 'low', CRITICAL: 'critical' };
const HP_THRESHOLDS = { OK: 0.5, LOW: 0.25 };

export const formatScore = (n) => String(Math.max(0, Math.floor(n))).padStart(7, '0');
export const formatPercent = (ratio) => `${Math.round(ratio * 100)}%`;
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function hpLevel(ratio) {
  if (ratio > HP_THRESHOLDS.OK) return HP_LEVEL.OK;
  return ratio > HP_THRESHOLDS.LOW ? HP_LEVEL.LOW : HP_LEVEL.CRITICAL;
}

export function buildHudModel(world, { highScore = 0, muted = false } = {}) {
  const { player, phases, boss } = world;
  const phase = phases.phase;
  return {
    hpRatio: player.hpRatio,
    hpLevel: hpLevel(player.hpRatio),
    lives: player.lives,
    torpedoes: player.torpedoCount,
    score: world.score,
    highScore: Math.max(highScore, world.score),
    muted,
    phase: phase && { number: phases.number, total: phases.total, name: phase.name },
    boss:
      boss && !boss.entering
        ? { name: boss.name, ratio: boss.hp / boss.maxHp, enraged: boss.enraged, shielded: Boolean(boss.shielded) }
        : null,
    wave:
      phase?.type === PHASE_TYPE.WAVE && phases.status === PHASE_STATUS.ACTIVE
        ? { done: phases.resolved, total: phase.count, ratio: phases.resolved / phase.count }
        : null,
    powerUps: Object.entries(player.powerUps).map(([type, left]) => ({
      type,
      label: POWERUPS[type].label,
      icon: POWERUPS[type].icon,
      color: POWERUPS[type].color,
      ratio: left / POWERUPS[type].duration,
    })),
  };
}

/** Cartel de fase: null si no hay que mostrar ninguno. `key` cambia cuando el cartel es otro. */
export function buildBannerModel(phases) {
  if (phases.status === PHASE_STATUS.INTRO) {
    return { key: `intro-${phases.number}`, kicker: `Fase ${phases.number} de ${phases.total}`, title: phases.phase.name, subtitle: phases.phase.objective };
  }
  if (phases.status === PHASE_STATUS.CLEAR) {
    const flawless = phases.lastClearFlawless;
    const bonus = SCORE.PHASE_CLEAR + (flawless ? SCORE.NO_DAMAGE : 0);
    return { key: `clear-${phases.number}`, kicker: 'Objetivo cumplido', title: 'Fase superada', subtitle: `+${bonus} puntos${flawless ? ' · ¡sin daño!' : ''}` };
  }
  return null;
}

export function buildMenuModel({ difficulty, highScore }) {
  return {
    highScore,
    difficulties: Object.entries(DIFFICULTIES).map(([key, d]) => ({ key, label: d.label, lives: d.lives, selected: key === difficulty })),
  };
}

export function buildEndModel(world, { victory, highScore, newRecord }) {
  const { stats } = world;
  return {
    victory,
    title: victory ? '¡Victoria!' : 'Nave derribada',
    subtitle: victory ? 'La Estrella de la Muerte ha sido destruida' : `Caíste en la fase ${world.phases.number}: ${world.phases.phase?.name ?? ''}`,
    score: formatScore(world.score),
    newRecord,
    highScore: formatScore(highScore),
    stats: [
      { label: 'Precisión', value: formatPercent(world.accuracy) },
      { label: 'Derribos', value: String(stats.kills) },
      { label: 'Tiempo', value: formatTime(stats.time) },
      { label: 'Daño recibido', value: String(Math.round(stats.damageTaken)) },
      { label: 'Torpedos', value: String(stats.torpedoes) },
      { label: 'Fase', value: `${world.phases.number}/${world.phases.total}` },
    ],
  };
}

/** Avisos tácticos que la cabina muestra al recibir ciertos eventos de la simulación. */
export const ALERTS = {
  bossStage: ({ stage }) => ({ text: stage.label, tone: 'danger' }),
  vaderMode: ({ mode }) => (mode === 'windup' ? { text: '¡Embestida! Sal de la franja roja', tone: 'danger' } : null),
  powerUpCollected: ({ cfg }) => ({ text: `${cfg.label} activado`, tone: 'info' }),
  playerDestroyed: ({ livesLeft }) => ({ text: livesLeft > 0 ? `Nave perdida · quedan ${livesLeft}` : 'Sin naves', tone: 'danger' }),
  phaseStart: ({ phase }) => (phase.type === PHASE_TYPE.BOSS ? { text: `Contacto: ${phase.name}`, tone: 'warning' } : null),
};
