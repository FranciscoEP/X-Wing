import { CANVAS, DIFFICULTIES, KEYS, POWERUPS, SCORE, STORAGE_KEY } from './config.js';
import { load, save } from './core/storage.js';
import { overlaps, prune, weightedPick } from './core/utils.js';
import { createBoss } from './entities/bosses/index.js';
import { Enemy } from './entities/Enemy.js';
import { Player } from './entities/Player.js';
import { PowerUp } from './entities/PowerUp.js';
import { Background } from './systems/Background.js';
import { Effects } from './systems/Effects.js';
import { Particles } from './systems/Particles.js';
import { PhaseManager } from './systems/PhaseManager.js';
import { drawHUD } from './ui/HUD.js';
import { drawBanner, drawEnd, drawMenu, drawPause } from './ui/Screens.js';

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', VICTORY: 'victory' };
const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);
const RESPAWN_DELAY = 1.5;

/**
 * Orquesta el bucle principal, la máquina de estados y las colisiones.
 * También actúa como "world" para las entidades (spawnBullet, spawnEnemy, damagePlayer...).
 */
export class Game {
  constructor(canvas, { images, audio, input, startPhase = 0 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.audio = audio;
    this.input = input;
    this.startPhase = startPhase;

    this.state = STATE.MENU;
    this.difficultyKey = 'NORMAL';
    this.highScore = Number(load(STORAGE_KEY, 0)) || 0;
    this.time = 0;

    this.background = new Background(images.background);
    this.particles = new Particles();
    this.effects = new Effects();
    this.resetWorld();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) this.state = STATE.PAUSED;
    });
  }

  get difficulty() {
    return DIFFICULTIES[this.difficultyKey];
  }

  resetWorld() {
    this.player = new Player(this.images.player, this.difficulty.lives);
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.boss = null;
    this.score = 0;
    this.newRecord = false;
    this.respawnTimer = 0;
    this.particles.clear();
    this.phases = new PhaseManager({
      onPhaseStart: (phase) => this.onPhaseStart(phase),
      onPhaseClear: (phase, flawless) => this.onPhaseClear(phase, flawless),
      onVictory: () => this.endGame(true),
    });
  }

  // ---------------------------------------------------------------- bucle

  start() {
    let last = performance.now();
    const frame = (now) => {
      // Limitar dt evita saltos enormes tras cambiar de pestaña
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    this.time += dt;
    if (this.input.consume(KEYS.MUTE)) this.audio.toggleMute();

    switch (this.state) {
      case STATE.MENU:
        this.updateMenu();
        this.background.update(dt);
        break;
      case STATE.PLAYING:
        if (this.input.consume(KEYS.PAUSE)) {
          this.state = STATE.PAUSED;
          return;
        }
        this.updatePlaying(dt);
        break;
      case STATE.PAUSED:
        if (this.input.consume(KEYS.PAUSE)) this.state = STATE.PLAYING;
        else if (this.input.consume(['KeyQ'])) this.toMenu();
        break;
      case STATE.GAME_OVER:
      case STATE.VICTORY:
        this.background.update(dt);
        this.particles.update(dt);
        this.effects.update(dt);
        if (this.input.consume(KEYS.CONFIRM)) this.toMenu();
        break;
    }
  }

  updateMenu() {
    const i = DIFFICULTY_KEYS.indexOf(this.difficultyKey);
    if (this.input.consume(KEYS.UP)) this.difficultyKey = DIFFICULTY_KEYS[(i + DIFFICULTY_KEYS.length - 1) % DIFFICULTY_KEYS.length];
    if (this.input.consume(KEYS.DOWN)) this.difficultyKey = DIFFICULTY_KEYS[(i + 1) % DIFFICULTY_KEYS.length];
    if (this.input.consume(KEYS.CONFIRM) || this.input.consume(KEYS.SHOOT)) this.startRun();
  }

  startRun() {
    this.resetWorld();
    this.state = STATE.PLAYING;
    this.phases.start(this.startPhase);
    this.audio.startMusic();
  }

  toMenu() {
    this.audio.stopMusic();
    this.resetWorld();
    this.state = STATE.MENU;
  }

  updatePlaying(dt) {
    const { player, input } = this;

    this.phases.update(dt);
    this.background.speedMultiplier = this.boss ? 0.5 : 1;
    this.background.update(dt);

    player.update(dt, input);
    if (input.isDown(KEYS.SHOOT)) {
      const shots = player.tryShoot();
      if (shots.length) {
        this.playerBullets.push(...shots);
        this.audio.play('shoot', { volume: 0.15, minGap: 0.08 });
      }
    }
    if (input.consume(KEYS.BOMB)) this.useBomb();

    if (this.phases.shouldSpawnWaveEnemy(dt)) this.spawnEnemy(this.phases.phase.enemy, undefined, true);

    for (const e of this.enemies) e.update(dt, this);
    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    for (const p of this.powerUps) p.update(dt);
    if (this.boss) this.boss.update(dt, this);

    this.handleCollisions();
    this.cleanup();
    this.updateRespawn(dt);

    this.particles.update(dt);
    this.effects.update(dt);
  }

  updateRespawn(dt) {
    if (!this.player.dead) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) return;
    if (this.player.lives > 0) {
      this.player.reset();
      this.enemyBullets.length = 0;
    } else {
      this.endGame(false);
    }
  }

  // ------------------------------------------------------------- "world"

  spawnBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  spawnEnemy(type, y, fromWave = false) {
    const enemy = new Enemy(type, this.images.tie, this.difficulty, y);
    enemy.fromWave = fromWave;
    this.enemies.push(enemy);
  }

  damagePlayer(amount, { silent = false } = {}) {
    const { player } = this;
    if (!player.canBeHit) return;
    this.phases.damageTaken += amount;
    const destroyed = player.takeDamage(amount);
    if (!silent) {
      this.effects.shake(6, 0.2);
      this.effects.flash('#ff0000', 0.15);
    }
    if (destroyed) {
      this.particles.explosion(player.cx, player.cy, { count: 80, speed: 320, size: 4 });
      this.effects.shake(16, 0.6);
      this.audio.play('death', { volume: 0.5 });
      this.respawnTimer = RESPAWN_DELAY;
    }
  }

  addScore(points, x, y) {
    this.score += points;
    if (x !== undefined) this.particles.text(x, y, `+${points}`);
  }

  // ------------------------------------------------------------- fases

  onPhaseStart(phase) {
    if (phase.type === 'BOSS') this.boss = createBoss(phase.boss, this.difficulty, this.images);
  }

  onPhaseClear(phase, flawless) {
    this.addScore(SCORE.PHASE_CLEAR);
    if (flawless) this.addScore(SCORE.NO_DAMAGE);
    this.lastClearFlawless = flawless;
    if (phase.type === 'BOSS') this.player.heal(40);
  }

  endGame(victory) {
    this.state = victory ? STATE.VICTORY : STATE.GAME_OVER;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.newRecord = true;
      save(STORAGE_KEY, this.highScore);
    }
    this.audio.stopMusic();
  }

  // ------------------------------------------------------------- combate

  useBomb() {
    const { player } = this;
    if (player.dead || player.bombs <= 0) return;
    player.bombs--;
    for (const b of this.enemyBullets) this.particles.sparks(b.cx, b.cy, '#facc15', 2);
    this.enemyBullets.length = 0;
    for (const e of this.enemies) this.hitEnemy(e, 60);
    if (this.boss?.vulnerable && this.boss.takeDamage(80)) this.onBossDying();
    this.effects.flash('#fff6c0', 0.4);
    this.effects.shake(10, 0.4);
  }

  hitEnemy(enemy, damage) {
    if (enemy.dead) return;
    if (!enemy.takeDamage(damage)) return;
    this.particles.explosion(enemy.cx, enemy.cy);
    this.addScore(enemy.score, enemy.cx, enemy.y);
    if (Math.random() < this.difficulty.dropRate) {
      this.powerUps.push(new PowerUp(weightedPick(POWERUPS), enemy.cx, enemy.cy));
    }
  }

  onBossDying() {
    const { boss } = this;
    this.addScore(boss.score, boss.cx, boss.cy);
    this.enemyBullets.length = 0;
    this.effects.shake(12, 2);
  }

  handleCollisions() {
    const { player, boss } = this;

    for (const bullet of this.playerBullets) {
      for (const enemy of this.enemies) {
        if (!enemy.dead && overlaps(bullet, enemy, 4)) {
          bullet.dead = true;
          this.particles.sparks(bullet.cx, bullet.cy, '#ff6b6b');
          this.hitEnemy(enemy, bullet.damage);
          break;
        }
      }
      if (bullet.dead || !boss?.vulnerable) continue;
      const hit = boss.hitTest(bullet);
      if (hit === 'hit') {
        bullet.dead = true;
        this.particles.sparks(bullet.cx, bullet.cy);
        if (boss.takeDamage(bullet.damage)) this.onBossDying();
      } else if (hit === 'armor') {
        bullet.dead = true;
        this.particles.sparks(bullet.cx, bullet.cy, '#9aa1ab', 3);
      }
    }

    if (player.dead) return;

    for (const bullet of this.enemyBullets) {
      if (overlaps(bullet, player, 14)) {
        bullet.dead = true;
        if (player.shielded) this.particles.sparks(bullet.cx, bullet.cy, '#22d3ee');
        else this.damagePlayer(bullet.damage);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.dead && overlaps(enemy, player, 12)) {
        this.hitEnemy(enemy, Infinity);
        this.damagePlayer(30);
      }
    }

    if (boss?.vulnerable && boss.hitTest({ cx: player.cx, cy: player.cy, x: player.x + 16, y: player.y + 16, width: player.width - 32, height: player.height - 32 }) === 'hit') {
      this.damagePlayer(25);
    }

    for (const p of this.powerUps) {
      if (overlaps(p, player)) {
        p.dead = true;
        this.applyPowerUp(p);
      }
    }
  }

  applyPowerUp(powerUp) {
    const { player } = this;
    const cfg = POWERUPS[powerUp.type];
    if (cfg.duration) player.powerUps[powerUp.type] = cfg.duration;
    if (powerUp.type === 'REPAIR') player.heal(40);
    if (powerUp.type === 'BOMB') player.bombs = Math.min(5, player.bombs + 1);
    this.addScore(SCORE.POWERUP);
    this.particles.text(player.cx, player.y - 6, cfg.label.toUpperCase(), cfg.color);
  }

  cleanup() {
    for (const e of this.enemies) {
      if (e.dead && e.fromWave) this.phases.recordWaveEnemyGone(!e.escaped);
    }
    prune(this.enemies, (e) => !e.dead);
    prune(this.playerBullets, (b) => !b.dead);
    prune(this.enemyBullets, (b) => !b.dead);
    prune(this.powerUps, (p) => !p.dead);

    if (this.boss?.dead) {
      this.boss = null;
      this.phases.clear();
    }
  }

  // ------------------------------------------------------------- render

  render() {
    const { ctx } = this;
    ctx.save();
    this.effects.applyShake(ctx);
    this.background.draw(ctx);

    if (this.state !== STATE.MENU) {
      this.boss?.draw(ctx, this.time);
      for (const p of this.powerUps) p.draw(ctx);
      for (const e of this.enemies) e.draw(ctx);
      for (const b of this.playerBullets) b.draw(ctx);
      this.player.draw(ctx, this.time);
      for (const b of this.enemyBullets) b.draw(ctx);
      this.boss?.drawOverlay?.(ctx);
      this.particles.draw(ctx);
    }
    ctx.restore();
    this.effects.drawFlash(ctx, CANVAS.WIDTH, CANVAS.HEIGHT);

    switch (this.state) {
      case STATE.MENU:
        drawMenu(ctx, { difficulty: this.difficultyKey, highScore: this.highScore, time: this.time });
        break;
      case STATE.PLAYING:
        drawHUD(ctx, this);
        this.renderBanner();
        break;
      case STATE.PAUSED:
        drawHUD(ctx, this);
        drawPause(ctx);
        break;
      case STATE.GAME_OVER:
      case STATE.VICTORY:
        drawEnd(ctx, {
          victory: this.state === STATE.VICTORY,
          score: this.score,
          highScore: this.highScore,
          newRecord: this.newRecord,
          time: this.time,
        });
        break;
    }
  }

  renderBanner() {
    const { phases } = this;
    if (phases.status === 'intro') {
      drawBanner(this.ctx, `FASE ${phases.number}: ${phases.phase.name.toUpperCase()}`, phases.phase.objective, phases.bannerProgress);
    } else if (phases.status === 'clear') {
      const bonus = SCORE.PHASE_CLEAR + (this.lastClearFlawless ? SCORE.NO_DAMAGE : 0);
      const subtitle = `+${bonus} puntos${this.lastClearFlawless ? ' · ¡sin daño!' : ''}`;
      drawBanner(this.ctx, 'FASE SUPERADA', subtitle, phases.bannerProgress);
    }
  }
}
