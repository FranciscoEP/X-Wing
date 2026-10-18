import { PAL } from './art/palette.js';

/**
 * Traduce los eventos de la simulación a efectos visuales y sonoros.
 * Es el único lugar donde se decide "qué se ve/oye cuando pasa X".
 * Tamaños de explosión en píxeles del búfer (radio máximo de la bola de fuego).
 */
export function bindVisualFeedback(events, { particles, effects }) {
  events.on('enemyHit', ({ x, y }) => particles.sparks(x, y, PAL.redHi, 3));
  events.on('bossHit', ({ x, y }) => particles.sparks(x, y, PAL.yellow, 3));
  events.on('armorHit', ({ x, y }) => particles.sparks(x, y, PAL.mid, 2));
  events.on('shieldBlock', ({ x, y }) => particles.sparks(x, y, PAL.cyan, 3));
  events.on('enemyDestroyed', ({ x, y }) => particles.explosion(x, y, { size: 8 }));
  events.on('explosion', ({ x, y }) => particles.explosion(x, y, { size: 6, count: 6 }));
  events.on('scored', ({ points, at }) => at && particles.text(at.x, at.y, `${points}`));
  events.on('powerUpCollected', ({ cfg, x, y }) => particles.text(x, y - 10, cfg.label.toUpperCase(), cfg.color));
  events.on('playerHit', () => {
    effects.shake(6, 0.2);
    effects.flash(PAL.red, 0.12);
  });
  events.on('playerDestroyed', ({ x, y }) => {
    particles.explosion(x, y, { size: 14, count: 30, speed: 300 });
    particles.shockwave(x, y, 140, PAL.orange);
    effects.shake(16, 0.6);
  });
  events.on('torpedoBlast', ({ x, y, radius, cleared }) => {
    for (const b of cleared) particles.sparks(b.x, b.y, PAL.yellow, 2);
    particles.shockwave(x, y, radius);
    particles.explosion(x, y, { size: 16, count: 24, speed: 300 });
    effects.flash(PAL.glass, 0.2);
    effects.shake(10, 0.4);
  });
  events.on('bossDying', () => effects.shake(12, 2));
  events.on('bossDestroyed', ({ boss }) => {
    particles.explosion(boss.cx, boss.cy, { size: 30, count: 60, speed: 420 });
    particles.shockwave(boss.cx, boss.cy, 420, PAL.white, 0.7);
    effects.flash(PAL.white, 0.5);
  });
  events.on('squadronBroken', ({ x, y, divers }) => divers && particles.text(x, y - 20, '¡ROMPEN FILAS!', PAL.orange));
  events.on('enemyDodge', ({ enemy }) => particles.sparks(enemy.x + enemy.width, enemy.cy, PAL.glass, 2));
  events.on('mineBlast', ({ x, y, radius }) => {
    particles.explosion(x, y, { size: 12, count: 16 });
    particles.shockwave(x, y, radius, PAL.orange, 0.3);
    effects.shake(6, 0.25);
  });
  events.on('mineDestroyed', ({ x, y }) => particles.explosion(x, y, { size: 4, count: 6 }));
  events.on('vaderMode', ({ mode }) => mode === 'charge' && effects.shake(8, 0.4));
  events.on('superlaser', () => {
    effects.shake(14, 0.6);
    effects.flash(PAL.green, 0.25);
  });
}

export function bindAudioFeedback(events, audio) {
  events.on('shot', () => audio.play('shoot', { volume: 0.15, minGap: 0.08 }));
  events.on('playerDestroyed', () => audio.play('death', { volume: 0.5 }));
}
