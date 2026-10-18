import { POWERUP_ITEM } from '../config.js';
import { rand } from '../core/utils.js';
import { FONT } from '../ui/theme.js';

const LASER_COLORS = { friendly: '#ff3b3b', hostile: '#4dff6a' };
const SHIELD_COLOR = '#22d3ee';

export function drawBullet(ctx, b) {
  const color = b.color ?? (b.friendly ? LASER_COLORS.friendly : LASER_COLORS.hostile);
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillRect(-b.length / 2, -b.thickness / 2, b.length, b.thickness);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-b.length / 2 + 2, -b.thickness / 4, b.length - 4, b.thickness / 2);
  ctx.restore();
}

export function drawPlayer(ctx, player, sprite, time) {
  if (player.dead) return;
  // Parpadeo mientras es invulnerable
  if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
  const { width: w, height: h } = player;

  ctx.save();
  ctx.translate(player.cx, player.cy);
  ctx.rotate(player.tilt * 0.15);

  // Brillo de los motores
  const flicker = rand(0.7, 1);
  ctx.fillStyle = `rgba(255, 140, 60, ${0.6 * flicker})`;
  ctx.shadowColor = '#ff8c3c';
  ctx.shadowBlur = 14;
  for (const dy of [-12, 12]) {
    ctx.beginPath();
    ctx.ellipse(-w / 2 - 2, dy, 8 * flicker, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (sprite) {
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.fill();
  }

  if (player.shielded) {
    const left = player.powerUps.SHIELD;
    ctx.globalAlpha = left < 1.5 ? 0.3 + 0.3 * Math.sin(time * 20) : 0.45;
    ctx.strokeStyle = SHIELD_COLOR;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
    ctx.lineWidth = 2;
    ctx.shadowColor = SHIELD_COLOR;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemy(ctx, enemy, sprite) {
  ctx.save();
  if (enemy.hitFlash > 0) ctx.filter = 'brightness(2.5)';
  if (enemy.type === 'TIE_INTERCEPTOR') {
    ctx.shadowColor = '#ff4d4d';
    ctx.shadowBlur = 10;
  }
  if (sprite) {
    ctx.drawImage(sprite, enemy.x, enemy.y, enemy.width, enemy.height);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  }
  ctx.restore();
}

export function drawPowerUp(ctx, p) {
  // Parpadea durante sus últimos segundos
  if (p.timeLeft < POWERUP_ITEM.BLINK_BEFORE_END && Math.floor(p.age * 8) % 2 === 0) return;
  const r = p.width / 2;
  const { color, icon } = p.cfg;
  ctx.save();
  ctx.translate(p.cx, p.cy);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(10, 14, 30, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(p.age * 2);
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, p.cx, p.cy + 1);
  ctx.restore();
}

export function drawTorpedo(ctx, t, time) {
  const r = t.width / 2;
  ctx.save();
  // Estela
  const trail = ctx.createLinearGradient(t.cx - 70, 0, t.cx, 0);
  trail.addColorStop(0, 'rgba(120, 200, 255, 0)');
  trail.addColorStop(1, 'rgba(160, 220, 255, 0.8)');
  ctx.fillStyle = trail;
  ctx.fillRect(t.cx - 70, t.cy - r / 2, 70, r);
  // Núcleo pulsante
  ctx.shadowColor = '#8fd3ff';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#e6f6ff';
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r * (0.85 + 0.15 * Math.sin(time * 40)), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
