import { HITBOX, RENDER } from '../config.js';
import { SpriteCache } from './art/SpriteCache.js';
import { Background } from './Background.js';
import { drawBoss, drawBossOverlay } from './bosses.js';
import { Effects } from './Effects.js';
import { drawBullet, drawEnemy, drawHitbox, drawMine, drawPlayer, drawPowerUp, drawTorpedo } from './entities.js';
import { bindVisualFeedback } from './feedback.js';
import { Particles } from './Particles.js';
import { drawPort, drawTrenchBackground, drawTrenchVader } from './trench.js';

export const SCENE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', VICTORY: 'victory' };

/**
 * Dibuja el mundo en un búfer pixel de 480×270 (el canvas #game) que el CSS amplía sin
 * suavizar. Todo se pinta en píxeles enteros: nada de antialiasing ni efectos modernos.
 * Menús y HUD son HTML (ui/). Solo guarda estado visual: partículas, efectos, fondo, sprites.
 */
export class Renderer {
  constructor({ canvas, images = {} }) {
    canvas.width = RENDER.WIDTH;
    canvas.height = RENDER.HEIGHT;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = new SpriteCache();
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

  /** `scene`: { state, time, world, showHitbox, ... } (ver Game.scene()). */
  render(scene) {
    const { ctx } = this;
    const shake = this.effects.shakeOffset();
    ctx.setTransform(1, 0, 0, 1, shake.x, shake.y);
    // En la trinchera, sus paredes y suelo sustituyen al espacio
    const trench = scene.state !== SCENE.MENU && scene.world?.trench;
    if (trench) drawTrenchBackground(ctx, trench);
    else this.background.draw(ctx);
    if (scene.state !== SCENE.MENU && scene.world) this.drawWorld(scene.world, scene.time, scene);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.effects.drawFlash(ctx, RENDER.WIDTH, RENDER.HEIGHT);
  }

  drawWorld(world, time, scene) {
    const { ctx, sprites } = this;
    const assets = { sprites, time };
    if (world.boss) drawBoss(ctx, world.boss, assets);
    for (const p of world.powerUps) drawPowerUp(ctx, p);
    for (const m of world.mines) drawMine(ctx, m, time);
    if (world.trench) drawPort(ctx, world.trench.port, time);
    for (const e of world.enemies) drawEnemy(ctx, e, sprites, time);
    for (const b of world.playerBullets) drawBullet(ctx, b);
    for (const t of world.torpedoes) drawTorpedo(ctx, t, time);
    if (world.trench) drawTrenchVader(ctx, world.trench.vader, sprites, time);
    drawPlayer(ctx, world.player, sprites, time);
    if (scene.showHitbox && !world.player.dead) drawHitbox(ctx, world.player.hitbox(HITBOX.PLAYER_VS_BULLET));
    for (const b of world.enemyBullets) drawBullet(ctx, b);
    if (world.boss) drawBossOverlay(ctx, world.boss, assets);
    this.particles.draw(ctx);
  }
}
