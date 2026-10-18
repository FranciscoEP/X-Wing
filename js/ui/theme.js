export const FONT = '"Orbitron", "Courier New", monospace';
export const COLORS = {
  yellow: '#ffe81f',
  red: '#ff3b3b',
  green: '#4ade80',
  blue: '#22d3ee',
  text: '#e8ecf4',
  dim: '#8b93a7',
  panel: 'rgba(8, 12, 28, 0.72)',
};

export function text(ctx, value, x, y, { size = 16, color = COLORS.text, align = 'left', weight = 'bold', baseline = 'alphabetic', glow } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
  }
  ctx.fillText(value, x, y);
  ctx.restore();
}

export function bar(ctx, x, y, w, h, ratio, color, back = 'rgba(255,255,255,0.12)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, w, h);
}
