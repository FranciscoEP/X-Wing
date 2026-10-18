import { CANVAS, PHASE_TYPE, POWERUPS } from '../config.js';
import { PHASE_STATUS } from '../sim/PhaseManager.js';
import { bar, COLORS, panel, text } from './theme.js';

const HP_THRESHOLDS = { OK: 0.5, LOW: 0.25 };

/**
 * Extrae del mundo solo lo que el HUD necesita. Así el HUD no conoce la estructura interna
 * de World y esta función se puede probar sin canvas.
 */
export function buildHudModel(world, { highScore = 0, muted = false } = {}) {
  const { player, phases, boss } = world;
  const phase = phases.phase;
  return {
    hpRatio: player.hpRatio,
    lives: player.lives,
    torpedoes: player.torpedoCount,
    score: world.score,
    highScore: Math.max(highScore, world.score),
    muted,
    phase: phase && { number: phases.number, total: phases.total, name: phase.name },
    boss: boss && !boss.entering ? { name: boss.name, ratio: boss.hp / boss.maxHp, enraged: boss.enraged } : null,
    wave:
      phase?.type === PHASE_TYPE.WAVE && phases.status === PHASE_STATUS.ACTIVE ? { done: phases.resolved, total: phase.count } : null,
    powerUps: Object.entries(player.powerUps).map(([type, left]) => ({ ...POWERUPS[type], ratio: left / POWERUPS[type].duration })),
  };
}

export function drawHUD(ctx, model, images) {
  // Casco: vida, vidas y torpedos
  panel(ctx, 12, 12, 230, 62);
  text(ctx, 'CASCO', 22, 32, { size: 11, color: COLORS.dim });
  const hpColor = model.hpRatio > HP_THRESHOLDS.OK ? COLORS.green : model.hpRatio > HP_THRESHOLDS.LOW ? COLORS.yellow : COLORS.red;
  bar(ctx, 76, 22, 154, 12, model.hpRatio, hpColor);
  text(ctx, 'VIDAS', 22, 58, { size: 11, color: COLORS.dim });
  for (let i = 0; i < model.lives; i++) {
    if (images.player) ctx.drawImage(images.player, 76 + i * 22, 45, 18, 17);
  }
  text(ctx, `TORPEDOS ${model.torpedoes}`, 230, 58, { size: 11, color: COLORS.yellow, align: 'right' });

  // Puntuación
  panel(ctx, CANVAS.WIDTH - 202, 12, 190, 62);
  text(ctx, String(model.score).padStart(7, '0'), CANVAS.WIDTH - 22, 40, { size: 22, color: COLORS.yellow, align: 'right' });
  text(ctx, `RÉCORD ${model.highScore}`, CANVAS.WIDTH - 22, 62, { size: 11, color: COLORS.dim, align: 'right' });

  // Fase / jefe / progreso de oleada
  const cx = CANVAS.WIDTH / 2;
  if (model.phase) {
    const { number, total, name } = model.phase;
    text(ctx, `FASE ${number}/${total} · ${name.toUpperCase()}`, cx, 28, { size: 12, color: COLORS.dim, align: 'center' });
  }
  if (model.boss) {
    text(ctx, model.boss.name.toUpperCase(), cx, 48, { size: 12, color: COLORS.red, align: 'center' });
    bar(ctx, cx - 160, 54, 320, 10, model.boss.ratio, model.boss.enraged ? '#ff7a1a' : COLORS.red);
  } else if (model.wave) {
    text(ctx, `${model.wave.done}/${model.wave.total}`, cx, 50, { size: 14, align: 'center' });
  }

  // Power-ups activos
  model.powerUps.forEach((p, i) => {
    const y = CANVAS.HEIGHT - 30 - i * 26;
    panel(ctx, 12, y - 6, 170, 22);
    text(ctx, p.label, 20, y + 9, { size: 10, color: p.color });
    bar(ctx, 120, y + 1, 54, 6, p.ratio, p.color);
  });

  if (model.muted) text(ctx, 'SILENCIO (M)', CANVAS.WIDTH - 12, CANVAS.HEIGHT - 12, { size: 10, color: COLORS.dim, align: 'right' });
}
