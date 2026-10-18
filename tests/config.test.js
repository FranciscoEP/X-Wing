import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BOSS_TYPES, DIFFICULTIES, ENEMY_TYPES, PHASE_TYPE, PHASES, POWERUPS } from '../js/config.js';
import { BOSS_RENDERERS } from '../js/render/bosses.js';
import { BOSS_CLASSES } from '../js/sim/bosses/registry.js';
import { POWERUP_EFFECTS } from '../js/sim/powerups.js';

// Una errata en config.js rompía el juego en tiempo de ejecución; estas pruebas la detectan antes.
describe('integridad de config.js', () => {
  it('cada fase referencia un enemigo o jefe existente', () => {
    for (const phase of PHASES) {
      assert.ok(Object.values(PHASE_TYPE).includes(phase.type), `tipo inválido en ${phase.name}`);
      if (phase.type === PHASE_TYPE.WAVE) {
        assert.ok(ENEMY_TYPES[phase.enemy], `enemigo ${phase.enemy}`);
        assert.ok(phase.count > 0 && phase.spawnEvery > 0);
      } else {
        assert.ok(BOSS_TYPES[phase.boss], `jefe ${phase.boss}`);
      }
    }
  });

  it('cada jefe tiene clase, datos y renderer', () => {
    for (const type of Object.keys(BOSS_TYPES)) {
      assert.ok(BOSS_CLASSES[type], `clase de ${type}`);
      assert.ok(BOSS_RENDERERS[type], `renderer de ${type}`);
    }
  });

  it('cada power-up tiene efecto y un peso positivo', () => {
    for (const [type, cfg] of Object.entries(POWERUPS)) {
      assert.ok(POWERUP_EFFECTS[type], `efecto de ${type}`);
      assert.ok(cfg.weight > 0);
    }
  });

  it('las dificultades son coherentes (más difícil = menos vidas)', () => {
    assert.ok(DIFFICULTIES.EASY.lives > DIFFICULTIES.NORMAL.lives);
    assert.ok(DIFFICULTIES.NORMAL.lives > DIFFICULTIES.HARD.lives);
    for (const d of Object.values(DIFFICULTIES)) assert.ok(d.lives > 0 && d.dropRate >= 0 && d.dropRate <= 1);
  });
});
