import { CANVAS, DIFFICULTIES, PHASE_TYPE, POWERUPS, SCORE } from '../config.js';
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

/**
 * Zonas de la pantalla (unidades de simulación) que tapan los paneles del HUD: si la nave pasa
 * por debajo, el panel se vuelve transparente para no ocultarla.
 */
export const HUD_ZONES = {
  hull: { x: 0, y: 0, width: 260, height: 120 },
  score: { x: CANVAS.WIDTH - 200, y: 0, width: 200, height: 90 },
};

const under = (player, zone) =>
  !player.dead && player.x < zone.x + zone.width && player.x + player.width > zone.x && player.y < zone.y + zone.height;

export function buildHudModel(world, { highScore = 0, muted = false } = {}) {
  const { player, phases, boss } = world;
  const phase = phases.phase;
  return {
    faded: { hull: under(player, HUD_ZONES.hull), score: under(player, HUD_ZONES.score) },
    countdown: world.trench && !world.trench.won ? { time: formatTime(Math.ceil(world.trench.timeLeft)), urgent: world.trench.timeLeft <= 10 } : null,
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
    subtitle: victory
      ? 'La Estrella de la Muerte ha sido destruida'
      : world.outcomeReason === 'superlaser'
        ? 'Se acabó el tiempo: la Estrella de la Muerte disparó'
        : `Caíste en la fase ${world.phases.number}: ${world.phases.phase?.name ?? ''}`,
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
  vaderLock: () => ({ text: 'Vader te tiene en la mira', tone: 'danger' }),
  bossPartDestroyed: ({ part }) => ({ text: `${part.cfg.label}: destruida`, tone: 'info' }),
  bridgeExposed: () => ({ text: '¡Puente expuesto! Dispara al puente', tone: 'warning' }),
  trenchStart: () => ({ text: 'Escudo reparado · +2 torpedos', tone: 'info' }),
  trenchVader: () => ({ text: '¡Vader detrás de ti!', tone: 'danger' }),
  portInRange: () => ({ text: '¡Puerto a la vista! Torpedo (K)', tone: 'warning' }),
  portDeflect: () => ({ text: 'Los láseres no bastan: usa un torpedo', tone: 'info' }),
  powerUpCollected: ({ cfg }) => ({ text: `${cfg.label} activado`, tone: 'info' }),
  playerDestroyed: ({ livesLeft }) => ({ text: livesLeft > 0 ? `Nave perdida · quedan ${livesLeft}` : 'Sin naves', tone: 'danger' }),
  phaseStart: ({ phase }) => (phase.type === PHASE_TYPE.BOSS ? { text: `Contacto: ${phase.name}`, tone: 'warning' } : null),
};
