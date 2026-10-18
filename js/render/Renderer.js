import { CANVAS } from '../config.js';
import { SpriteCache } from './art/SpriteCache.js';
import { Background } from './Background.js';
import { drawBoss, drawBossOverlay } from './bosses.js';
import { Effects } from './Effects.js';
import { drawBullet, drawEnemy, drawPlayer, drawPowerUp, drawTorpedo } from './entities.js';
import { bindVisualFeedback } from './feedback.js';
import { Particles } from './Particles.js';

export const SCENE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', VICTORY: 'victory' };

/**
 * Dibuja el mundo en un canvas 2D (a `scale` × resolución lógica, para pantallas HiDPI) y,
 * si hay `postFx`, le aplica bloom y ondas de choque en WebGL. Menús y HUD son HTML (ui/).
 * Solo guarda estado visual: partículas, efectos, fondo y sprites precalculados.
 */
export class Renderer {
  constructor({ canvas, images, scale = 1, postFx = null }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = scale;
    this.postFx = postFx;
    this.sprites = new SpriteCache(images, scale);
    this.background = new Background(images.background);
    this.particles = new Particles();
    this.effects = new Effects();
    this.time = 0;
  }

  /** Conecta los eventos de una nueva partida con los efectos visuales. */
  attach(world) {
    this.particles.clear();
    bindVisualFeedback(world.events, { particles: this.particles, effects: this.effects });
  }

  update(dt, { bossActive = false } = {}) {
    this.time += dt;
    this.background.speedMultiplier = bossActive ? 0.5 : 1;
    this.background.update(dt);
    this.particles.update(dt);
    this.effects.update(dt);
  }

  /** `scene`: { state, time, world, ... } (ver Game.scene()). */
  render(scene) {
    const { ctx } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.save();
    this.effects.applyShake(ctx);
    this.background.draw(ctx);
    if (scene.state !== SCENE.MENU && scene.world) this.drawWorld(scene.world, scene.time);
    ctx.restore();
    this.effects.drawFlash(ctx, CANVAS.WIDTH, CANVAS.HEIGHT);
    this.postFx?.render(this.canvas, this.effects.postState());
  }

  drawWorld(world, time) {
    const { ctx, sprites } = this;
    const assets = { sprites, time };
    if (world.boss) drawBoss(ctx, world.boss, assets);
    for (const p of world.powerUps) drawPowerUp(ctx, p);
    for (const e of world.enemies) drawEnemy(ctx, e, sprites);
    for (const b of world.playerBullets) drawBullet(ctx, b);
    for (const t of world.torpedoes) drawTorpedo(ctx, t, time);
    drawPlayer(ctx, world.player, sprites, time);
    for (const b of world.enemyBullets) drawBullet(ctx, b);
    if (world.boss) drawBossOverlay(ctx, world.boss, assets);
    this.particles.draw(ctx);
  }
}
