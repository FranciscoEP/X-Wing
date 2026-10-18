/**
 * Traduce los eventos de la simulación a efectos visuales y sonoros.
 * Es el único lugar donde se decide "qué se ve/oye cuando pasa X".
 */
export function bindVisualFeedback(events, { particles, effects }) {
  events.on('enemyHit', ({ x, y }) => particles.sparks(x, y, '#ff6b6b'));
  events.on('bossHit', ({ x, y }) => particles.sparks(x, y));
  events.on('armorHit', ({ x, y }) => particles.sparks(x, y, '#9aa1ab', 3));
  events.on('shieldBlock', ({ x, y }) => particles.sparks(x, y, '#22d3ee'));
  events.on('enemyDestroyed', ({ x, y }) => {
    particles.explosion(x, y);
    effects.wave(x, y, { radius: 70, duration: 0.35, strength: 0.5 });
  });
  events.on('explosion', ({ x, y }) => particles.explosion(x, y, { count: 14 }));
  events.on('scored', ({ points, at }) => at && particles.text(at.x, at.y, `+${points}`));
  events.on('powerUpCollected', ({ cfg, x, y }) => particles.text(x, y - 6, cfg.label.toUpperCase(), cfg.color));
  events.on('playerHit', () => {
    effects.shake(6, 0.2);
    effects.flash('#ff0000', 0.15);
  });
  events.on('playerDestroyed', ({ x, y }) => {
    particles.explosion(x, y, { count: 80, speed: 320, size: 4 });
    effects.shake(16, 0.6);
    effects.wave(x, y, { radius: 260, duration: 0.7 });
  });
  events.on('torpedoBlast', ({ x, y, radius, cleared }) => {
    for (const b of cleared) particles.sparks(b.x, b.y, '#facc15', 2);
    particles.shockwave(x, y, radius);
    effects.wave(x, y, { radius: radius * 1.4, duration: 0.55 });
    particles.explosion(x, y, { count: 50, speed: 300, size: 4, colors: ['#e6f6ff', '#8fd3ff', '#ffb347'] });
    effects.flash('#cfeaff', 0.25);
    effects.shake(10, 0.4);
  });
  events.on('bossDying', () => effects.shake(12, 2));
  events.on('bossDestroyed', ({ boss }) => {
    particles.explosion(boss.cx, boss.cy, { count: 120, speed: 420, size: 5 });
    effects.flash('#fff', 0.6);
  });
  events.on('squadronBroken', ({ x, y, divers }) => divers && particles.text(x, y - 20, '¡ROMPEN FILAS!', '#ffb000'));
  events.on('enemyDodge', ({ enemy }) => particles.sparks(enemy.x + enemy.width, enemy.cy, '#9fd3ff', 4));
  events.on('vaderMode', ({ mode }) => mode === 'charge' && effects.shake(8, 0.4));
  events.on('superlaser', () => {
    effects.shake(14, 0.6);
    effects.flash('#4dff6a', 0.25);
  });
}

export function bindAudioFeedback(events, audio) {
  events.on('shot', () => audio.play('shoot', { volume: 0.15, minGap: 0.08 }));
  events.on('playerDestroyed', () => audio.play('death', { volume: 0.5 }));
}
