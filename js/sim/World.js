import { COMBAT, MINE, PHASE_TYPE, POWERUPS, SCORE, TORPEDO } from '../config.js';
import { EventBus } from '../core/EventBus.js';
import { random } from '../core/random.js';
import { centerOf, distance, prune, weightedPick } from '../core/utils.js';
import { spawnSquadron } from './ai/formations.js';
import { createBoss } from './bosses/registry.js';
import { resolveCollisions } from './collisions.js';
import { Enemy } from './entities/Enemy.js';
import { Player } from './entities/Player.js';
import { PowerUp } from './entities/PowerUp.js';
import { PhaseManager } from './PhaseManager.js';
import { applyPowerUp } from './powerups.js';

export const OUTCOME = { VICTORY: 'victory', DEFEAT: 'defeat' };

/**
 * Simulación completa de una partida, sin DOM ni canvas: entidades, fases, combate y puntuación.
 * Todo lo que la presentación necesita saber se publica como evento en `events`.
 *
 * Eventos: shot, enemyHit, enemyDestroyed, enemyEscaped, bossHit, armorHit, bossDying,
 * bossDestroyed, explosion, shieldBlock, playerHit, playerDestroyed, playerRespawn,
 * powerUpCollected, torpedoLaunched, torpedoBlast, superlaser, enemyDodge, enemyDive, squadronBroken,
 * bossPartDestroyed, bridgeExposed, beamCharge, hangarLaunch, mineDropped, mineArmed, mineBlast, mineDestroyed, enemyCharge, enemyTwinShot, enemyPass, bossStage, scored, phaseStart, phaseClear, gameOver.
 */
export class World {
  constructor({ difficulty, events = new EventBus() }) {
    this.difficulty = difficulty;
    this.events = events;
    this.player = new Player(difficulty.lives);
    this.enemies = [];
    this.squadrons = [];
    this.mines = [];
    this.playerBullets = [];
    this.torpedoes = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.boss = null;
    this.score = 0;
    this.respawnTimer = 0;
    this.outcome = null;
    this.stats = { time: 0, shotsFired: 0, shotsHit: 0, kills: 0, damageTaken: 0, torpedoes: 0 };
    this.phases = new PhaseManager({
      onPhaseStart: (phase) => this.onPhaseStart(phase),
      onPhaseClear: (phase, flawless) => this.onPhaseClear(phase, flawless),
      onVictory: () => this.finish(OUTCOME.VICTORY),
    });
  }

  start(fromPhase = 0) {
    this.phases.start(fromPhase);
  }

  emit(name, payload = {}) {
    this.events.emit(name, payload);
  }

  get isOver() {
    return this.outcome !== null;
  }

  /** Avanza la simulación `dt` segundos. `controls`: { moveX, moveY, shoot, torpedo }. */
  update(dt, controls = {}) {
    if (this.isOver) return;
    this.stats.time += dt;
    this.phases.update(dt);

    this.player.update(dt, controls);
    if (controls.shoot) this.playerShoot();
    if (controls.torpedo) this.launchTorpedo();

    const squadron = this.phases.nextSquadron(dt);
    if (squadron) spawnSquadron(this, squadron.enemy ?? this.phases.phase.enemy, squadron);

    for (const e of this.enemies) e.update(dt, this);
    for (const s of this.squadrons) s.update(dt, this);
    for (const b of this.playerBullets) b.update(dt);
    for (const t of this.torpedoes) t.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    for (const p of this.powerUps) p.update(dt);
    for (const m of this.mines) m.update(dt, this);
    this.boss?.update(dt, this);

    resolveCollisions(this);
    this.removeDead();
    this.updateRespawn(dt);
  }

  // ------------------------------------------------- API para entidades

  spawnEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  spawnEnemy(type, opts = {}) {
    const enemy = new Enemy(type, this.difficulty, opts);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnMine(mine) {
    this.mines.push(mine);
    this.emit('mineDropped', { mine });
  }

  /** La mina estalla: daña al jugador si está dentro del radio. */
  detonateMine(mine) {
    if (mine.dead) return;
    mine.dead = true;
    this.emit('mineBlast', { x: mine.cx, y: mine.cy, radius: MINE.radius });
    const { player } = this;
    if (Math.hypot(player.cx - mine.cx, player.cy - mine.cy) < MINE.radius) this.damagePlayer(MINE.damage);
  }

  /** Un láser o torpedo destruye la mina antes de que estalle (sin daño). */
  destroyMine(mine) {
    this.emit('mineDestroyed', { x: mine.cx, y: mine.cy });
    this.addScore(MINE.score, { x: mine.cx, y: mine.cy });
  }

  addSquadron(squadron) {
    this.squadrons.push(squadron);
  }

  damagePlayer(amount, { silent = false } = {}) {
    const { player } = this;
    if (!player.canBeHit) return;
    this.phases.recordDamage(amount);
    this.stats.damageTaken += amount;
    const destroyed = player.takeDamage(amount);
    if (!silent) this.emit('playerHit', { amount });
    if (destroyed) {
      this.respawnTimer = COMBAT.RESPAWN_DELAY;
      this.emit('playerDestroyed', { x: player.cx, y: player.cy, livesLeft: player.lives });
    }
  }

  // ------------------------------------------------------------ combate

  playerShoot() {
    const shots = this.player.tryShoot();
    if (!shots.length) return;
    this.playerBullets.push(...shots);
    this.stats.shotsFired += shots.length;
    this.emit('shot');
  }

  launchTorpedo() {
    const torpedo = this.player.launchTorpedo();
    if (!torpedo) return;
    this.torpedoes.push(torpedo);
    this.stats.torpedoes++;
    this.emit('torpedoLaunched', { x: torpedo.cx, y: torpedo.cy });
  }

  /** Onda expansiva: daña enemigos en el radio, borra balas cercanas y, si fue directo, daña al jefe. */
  detonateTorpedo(torpedo, { directBossHit = false } = {}) {
    torpedo.dead = true;
    const center = { x: torpedo.cx, y: torpedo.cy };
    const cleared = [];
    for (const b of this.enemyBullets) {
      if (distance(center, centerOf(b)) <= TORPEDO.CLEAR_BULLETS_RADIUS) {
        b.dead = true;
        cleared.push({ x: b.cx, y: b.cy });
      }
    }
    this.emit('torpedoBlast', { ...center, radius: TORPEDO.BLAST_RADIUS, cleared });
    for (const m of this.mines) {
      if (!m.dead && distance(center, centerOf(m)) <= TORPEDO.BLAST_RADIUS) {
        m.dead = true;
        this.destroyMine(m);
      }
    }
    for (const e of this.enemies) {
      if (!e.dead && distance(center, centerOf(e)) <= TORPEDO.BLAST_RADIUS) this.hitEnemy(e, TORPEDO.ENEMY_DAMAGE);
    }
    if (directBossHit && this.boss?.vulnerable) this.hitBoss(TORPEDO.BOSS_DAMAGE, torpedo);
  }

  hitEnemy(enemy, damage) {
    if (!enemy.takeDamage(damage)) return;
    this.stats.kills++;
    this.emit('enemyDestroyed', { x: enemy.cx, y: enemy.cy, enemy });
    this.addScore(enemy.score, { x: enemy.cx, y: enemy.y });
    if (random() < this.difficulty.dropRate) {
      this.powerUps.push(new PowerUp(weightedPick(POWERUPS), enemy.cx, enemy.cy));
    }
  }

  /** `source` (el proyectil) permite a los jefes por partes saber qué parte recibió el golpe. */
  hitBoss(damage, source = null) {
    const { boss } = this;
    const dying = boss.takeDamage(damage, source);
    this.announceDestroyedParts(boss);
    if (!dying) return;
    this.addScore(boss.score, { x: boss.cx, y: boss.cy });
    this.enemyBullets.length = 0;
    this.emit('bossDying', { boss });
  }

  /** Un láser del jugador alcanzó un objetivo (para la precisión). */
  recordHit() {
    this.stats.shotsHit++;
  }

  /** Precisión 0..1 de los láseres del jugador. */
  get accuracy() {
    return this.stats.shotsFired ? this.stats.shotsHit / this.stats.shotsFired : 0;
  }

  /** Jefes por partes: anuncia y puntúa cada parte destruida (una vez) y el puente expuesto. */
  announceDestroyedParts(boss) {
    if (!boss.parts) return;
    for (const part of boss.parts) {
      if (!part.destroyed || part.announced) continue;
      part.announced = true;
      const at = centerOf(boss.rectOf(part));
      this.emit('bossPartDestroyed', { boss, part, ...at });
      this.addScore(boss.partScore, at);
    }
    if (boss.bridgeExposed && !boss.bridgeAnnounced) {
      boss.bridgeAnnounced = true;
      this.emit('bridgeExposed', { boss });
    }
  }

  collectPowerUp(powerUp) {
    const cfg = applyPowerUp(this.player, powerUp.type);
    this.addScore(SCORE.POWERUP);
    this.emit('powerUpCollected', { type: powerUp.type, cfg, x: this.player.cx, y: this.player.y });
  }

  addScore(points, at = null) {
    this.score += points;
    this.emit('scored', { points, at });
  }

  // ------------------------------------------------------------- fases

  onPhaseStart(phase) {
    if (phase.type === PHASE_TYPE.BOSS) this.boss = createBoss(phase.boss, this.difficulty);
    this.emit('phaseStart', { phase });
  }

  onPhaseClear(phase, flawless) {
    this.addScore(SCORE.PHASE_CLEAR);
    if (flawless) this.addScore(SCORE.NO_DAMAGE);
    if (phase.type === PHASE_TYPE.BOSS) this.player.heal(COMBAT.BOSS_CLEAR_HEAL);
    this.emit('phaseClear', { phase, flawless });
  }

  finish(outcome) {
    if (this.isOver) return;
    this.outcome = outcome;
    this.emit('gameOver', { outcome, score: this.score });
  }

  // ------------------------------------------------------------ limpieza

  removeDead() {
    for (const e of this.enemies) {
      if (!e.dead) continue;
      if (e.escaped) this.emit('enemyEscaped', { enemy: e });
      if (e.fromWave) this.phases.recordWaveEnemyGone({ killed: !e.escaped });
    }
    prune(this.enemies, (e) => !e.dead);
    prune(this.squadrons, (s) => !s.done);
    prune(this.playerBullets, (b) => !b.dead);
    prune(this.torpedoes, (t) => !t.dead);
    prune(this.enemyBullets, (b) => !b.dead);
    prune(this.powerUps, (p) => !p.dead);
    prune(this.mines, (m) => !m.dead);

    if (this.boss?.dead) {
      this.boss = null;
      this.phases.clear();
    }
  }

  updateRespawn(dt) {
    if (!this.player.dead) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) return;
    if (this.player.lives > 0) {
      this.player.reset();
      this.enemyBullets.length = 0;
      this.emit('playerRespawn');
    } else {
      this.finish(OUTCOME.DEFEAT);
    }
  }
}
