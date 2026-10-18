import { CANVAS, DIFFICULTIES } from '../config.js';
import { COLORS, text } from './theme.js';

const W = CANVAS.WIDTH;
const H = CANVAS.HEIGHT;

function dim(ctx, alpha = 0.7) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

export function drawMenu(ctx, { difficulty, highScore, time }) {
  dim(ctx, 0.45);
  text(ctx, 'X-WING', W / 2, 130, { size: 72, color: COLORS.yellow, align: 'center', glow: COLORS.yellow });
  text(ctx, 'ASALTO A LA ESTRELLA DE LA MUERTE', W / 2, 172, { size: 18, color: COLORS.text, align: 'center' });

  text(ctx, 'DIFICULTAD', W / 2, 238, { size: 12, color: COLORS.dim, align: 'center' });
  Object.entries(DIFFICULTIES).forEach(([key, d], i) => {
    const selected = key === difficulty;
    const y = 272 + i * 34;
    text(ctx, selected ? `▶  ${d.label.toUpperCase()}  ◀` : d.label.toUpperCase(), W / 2, y, {
      size: selected ? 20 : 16,
      color: selected ? COLORS.yellow : COLORS.dim,
      align: 'center',
    });
  });

  if (Math.floor(time * 2) % 2 === 0) {
    text(ctx, 'PULSA ENTER PARA DESPEGAR', W / 2, 410, { size: 16, color: COLORS.text, align: 'center' });
  }
  text(ctx, 'WASD / FLECHAS: MOVER   ·   J / ESPACIO: DISPARAR   ·   K: TORPEDO   ·   P: PAUSA   ·   M: SONIDO', W / 2, 470, {
    size: 11,
    color: COLORS.dim,
    align: 'center',
    weight: 'normal',
  });
  if (highScore > 0) text(ctx, `RÉCORD: ${highScore}`, W / 2, 500, { size: 12, color: COLORS.yellow, align: 'center' });
}

export function drawPause(ctx) {
  dim(ctx);
  text(ctx, 'PAUSA', W / 2, H / 2 - 10, { size: 48, color: COLORS.yellow, align: 'center', glow: COLORS.yellow });
  text(ctx, 'P / ESC para continuar  ·  Q para volver al menú', W / 2, H / 2 + 36, { size: 13, color: COLORS.dim, align: 'center' });
}

export function drawEnd(ctx, { victory, score, highScore, newRecord, time }) {
  dim(ctx, 0.75);
  const title = victory ? '¡VICTORIA!' : 'GAME OVER';
  const color = victory ? COLORS.green : COLORS.red;
  text(ctx, title, W / 2, H / 2 - 60, { size: 56, color, align: 'center', glow: color });
  if (victory) text(ctx, 'La Estrella de la Muerte ha sido destruida', W / 2, H / 2 - 20, { size: 14, align: 'center' });
  text(ctx, `PUNTUACIÓN ${score}`, W / 2, H / 2 + 24, { size: 22, color: COLORS.yellow, align: 'center' });
  text(ctx, newRecord ? '¡NUEVO RÉCORD!' : `RÉCORD ${highScore}`, W / 2, H / 2 + 54, {
    size: 14,
    color: newRecord ? COLORS.yellow : COLORS.dim,
    align: 'center',
  });
  if (Math.floor(time * 2) % 2 === 0) {
    text(ctx, 'PULSA ENTER PARA VOLVER AL MENÚ', W / 2, H / 2 + 110, { size: 14, align: 'center' });
  }
}

/** Cartel de inicio/fin de fase que entra y sale con un fundido. */
export function drawBanner(ctx, title, subtitle, progress) {
  const alpha = Math.min(1, progress * 5, (1 - progress) * 5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, H / 2 - 60, W, 110);
  text(ctx, title, W / 2, H / 2 - 12, { size: 30, color: COLORS.yellow, align: 'center', glow: COLORS.yellow });
  text(ctx, subtitle, W / 2, H / 2 + 26, { size: 15, align: 'center' });
  ctx.restore();
}
