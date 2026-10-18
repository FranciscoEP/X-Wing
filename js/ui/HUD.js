import { CANVAS, PLAYER, POWERUPS } from '../config.js';
import { bar, COLORS, panel, text } from './theme.js';

export function drawHUD(ctx, game) {
  const { player, phases, boss } = game;

  // Casco: vida, vidas y torpedos
  panel(ctx, 12, 12, 230, 62);
  text(ctx, 'CASCO', 22, 32, { size: 11, color: COLORS.dim });
  const hpRatio = player.hp / PLAYER.MAX_HP;
  const hpColor = hpRatio > 0.5 ? COLORS.green : hpRatio > 0.25 ? COLORS.yellow : COLORS.red;
  bar(ctx, 76, 22, 154, 12, hpRatio, hpColor);
  text(ctx, 'VIDAS', 22, 58, { size: 11, color: COLORS.dim });
  for (let i = 0; i < player.lives; i++) {
    if (game.images.player) ctx.drawImage(game.images.player, 76 + i * 22, 45, 18, 17);
  }
  text(ctx, `TORPEDOS ${player.bombs}`, 230, 58, { size: 11, color: COLORS.yellow, align: 'right' });

  // Puntuación
  panel(ctx, CANVAS.WIDTH - 202, 12, 190, 62);
  text(ctx, String(game.score).padStart(7, '0'), CANVAS.WIDTH - 22, 40, { size: 22, color: COLORS.yellow, align: 'right' });
  text(ctx, `RÉCORD ${game.highScore}`, CANVAS.WIDTH - 22, 62, { size: 11, color: COLORS.dim, align: 'right' });

  // Fase / jefe
  const phase = phases.phase;
  if (phase) {
    const cx = CANVAS.WIDTH / 2;
    text(ctx, `FASE ${phases.number}/${phases.total} · ${phase.name.toUpperCase()}`, cx, 28, { size: 12, color: COLORS.dim, align: 'center' });
    if (boss && !boss.entering) {
      text(ctx, boss.name.toUpperCase(), cx, 48, { size: 12, color: COLORS.red, align: 'center' });
      bar(ctx, cx - 160, 54, 320, 10, boss.hp / boss.maxHp, boss.enraged ? '#ff7a1a' : COLORS.red);
    } else if (phase.type === 'WAVE' && phases.status === 'active') {
      text(ctx, `${phases.resolved}/${phase.count}`, cx, 50, { size: 14, color: COLORS.text, align: 'center' });
    }
  }

  // Power-ups activos
  const active = Object.entries(player.powerUps);
  active.forEach(([type, left], i) => {
    const cfg = POWERUPS[type];
    const y = CANVAS.HEIGHT - 30 - i * 26;
    panel(ctx, 12, y - 6, 170, 22);
    text(ctx, cfg.label, 20, y + 9, { size: 10, color: cfg.color });
    bar(ctx, 120, y + 1, 54, 6, left / cfg.duration, cfg.color);
  });

  if (game.audio.muted) text(ctx, 'SILENCIO (M)', CANVAS.WIDTH - 12, CANVAS.HEIGHT - 12, { size: 10, color: COLORS.dim, align: 'right' });
}
