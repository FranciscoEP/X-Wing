import { CANVAS } from '../config.js';
import { buildHudModel, drawHUD } from '../ui/HUD.js';
import { drawBanner, drawEnd, drawMenu, drawPause } from '../ui/Screens.js';
import { Background } from './Background.js';
import { drawBoss, drawBossOverlay } from './bosses.js';
import { Effects } from './Effects.js';
import { drawBullet, drawEnemy, drawPlayer, drawPowerUp, drawTorpedo } from './entities.js';
import { bindVisualFeedback } from './feedback.js';
import { Particles } from './Particles.js';

export const SCENE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', VICTORY: 'victory' };

/** Dibuja el mundo y las pantallas. Mantiene solo estado visual (partículas, sacudida, fondo). */
export class Renderer {
  constructor(ctx, images) {
    this.ctx = ctx;
    this.images = images;
    this.background = new Background(images.background);
    this.particles = new Particles();
    this.effects = new Effects();
  }

  /** Conecta los eventos de una nueva partida con los efectos visuales. */
  attach(world) {
    this.particles.clear();
    bindVisualFeedback(world.events, { particles: this.particles, effects: this.effects });
  }

  update(dt, { bossActive = false } = {}) {
    this.background.speedMultiplier = bossActive ? 0.5 : 1;
    this.background.update(dt);
    this.particles.update(dt);
    this.effects.update(dt);
  }

  /** `scene`: { state, time, world, highScore, newRecord, muted, difficulty }. */
  render(scene) {
    const { ctx } = this;
    ctx.save();
    this.effects.applyShake(ctx);
    this.background.draw(ctx);
    if (scene.state !== SCENE.MENU && scene.world) this.drawWorld(scene.world, scene.time);
    ctx.restore();
    this.effects.drawFlash(ctx, CANVAS.WIDTH, CANVAS.HEIGHT);
    this.drawOverlay(scene);
  }

  drawWorld(world, time) {
    const { ctx, images } = this;
    const assets = { images, time };
    if (world.boss) drawBoss(ctx, world.boss, assets);
    for (const p of world.powerUps) drawPowerUp(ctx, p);
    for (const e of world.enemies) drawEnemy(ctx, e, images.tie);
    for (const b of world.playerBullets) drawBullet(ctx, b);
    for (const t of world.torpedoes) drawTorpedo(ctx, t, time);
    drawPlayer(ctx, world.player, images.player, time);
    for (const b of world.enemyBullets) drawBullet(ctx, b);
    if (world.boss) drawBossOverlay(ctx, world.boss, assets);
    this.particles.draw(ctx);
  }

  drawOverlay(scene) {
    const { ctx, images } = this;
    switch (scene.state) {
      case SCENE.MENU:
        drawMenu(ctx, scene);
        break;
      case SCENE.PLAYING:
        drawHUD(ctx, buildHudModel(scene.world, scene), images);
        drawBanner(ctx, scene.world.phases);
        break;
      case SCENE.PAUSED:
        drawHUD(ctx, buildHudModel(scene.world, scene), images);
        drawPause(ctx);
        break;
      case SCENE.GAME_OVER:
      case SCENE.VICTORY:
        drawEnd(ctx, { ...scene, victory: scene.state === SCENE.VICTORY, score: scene.world.score });
        break;
    }
  }
}
