import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { DIFFICULTIES, PHASES, SCORE } from '../js/config.js';
import { VADER_STAGE } from '../js/sim/bosses/TieAdvanced.js';
import {
  ALERTS,
  buildBannerModel,
  buildEndModel,
  buildHudModel,
  buildMenuModel,
  formatPercent,
  formatScore,
  formatTime,
  HP_LEVEL,
  hpLevel,
} from '../js/ui/viewModel.js';
import { makeWorld, resetRandomSource, skipIntro, useSeed, waitBossReady } from './helpers.js';

beforeEach(() => useSeed());
afterEach(resetRandomSource);

describe('UI: formato', () => {
  it('puntuación con 7 dígitos, tiempo m:ss y porcentaje', () => {
    assert.equal(formatScore(1234), '0001234');
    assert.equal(formatScore(-5), '0000000');
    assert.equal(formatTime(125.9), '2:05');
    assert.equal(formatPercent(0.456), '46%');
  });

  it('nivel del casco según la vida', () => {
    assert.equal(hpLevel(0.9), HP_LEVEL.OK);
    assert.equal(hpLevel(0.4), HP_LEVEL.LOW);
    assert.equal(hpLevel(0.1), HP_LEVEL.CRITICAL);
  });
});

describe('UI: modelos de vista', () => {
  it('HUD en oleada: progreso de la oleada y sin jefe', () => {
    const world = makeWorld({ phase: 0 });
    skipIntro(world);
    const m = buildHudModel(world, { highScore: 99 });
    assert.equal(m.boss, null);
    assert.deepEqual(m.wave, { done: 0, total: PHASES[0].count, ratio: 0 });
    assert.equal(m.highScore, 99);
  });

  it('HUD con jefe: nombre, vida y escudo', () => {
    const world = makeWorld({ phase: 1 });
    waitBossReady(world);
    world.boss.shielded = true;
    const m = buildHudModel(world);
    assert.equal(m.boss.ratio, 1);
    assert.equal(m.boss.shielded, true);
    assert.equal(m.wave, null);
  });

  it('el récord del HUD nunca es menor que la puntuación actual', () => {
    const world = makeWorld({ phase: 0 });
    world.score = 5000;
    assert.equal(buildHudModel(world, { highScore: 100 }).highScore, 5000);
  });

  it('cartel: presentación de fase y fase superada con bonus', () => {
    const world = makeWorld({ phase: 0 });
    assert.equal(buildBannerModel(world.phases).title, PHASES[0].name);
    skipIntro(world);
    assert.equal(buildBannerModel(world.phases), null);
    world.phases.clear();
    const clear = buildBannerModel(world.phases);
    assert.match(clear.subtitle, new RegExp(`\\+${SCORE.PHASE_CLEAR + SCORE.NO_DAMAGE}`));
  });

  it('menú: marca la dificultad elegida', () => {
    const m = buildMenuModel({ difficulty: 'HARD', highScore: 0 });
    assert.equal(m.difficulties.length, Object.keys(DIFFICULTIES).length);
    assert.deepEqual(m.difficulties.filter((d) => d.selected).map((d) => d.key), ['HARD']);
  });

  it('fin de partida: estadísticas legibles', () => {
    const world = makeWorld({ phase: 0 });
    world.stats.shotsFired = 10;
    world.stats.shotsHit = 4;
    world.stats.time = 65;
    const m = buildEndModel(world, { victory: false, highScore: 0, newRecord: false });
    const byLabel = Object.fromEntries(m.stats.map((s) => [s.label, s.value]));
    assert.equal(byLabel['Precisión'], '40%');
    assert.equal(byLabel['Tiempo'], '1:05');
    assert.match(m.subtitle, /fase 1/);
  });

  it('avisos tácticos para etapas de Vader y embestida', () => {
    assert.equal(ALERTS.bossStage({ stage: VADER_STAGE.ASSAULT }).text, VADER_STAGE.ASSAULT.label);
    assert.match(ALERTS.vaderMode({ mode: 'windup' }).text, /Embestida/);
    assert.equal(ALERTS.vaderMode({ mode: 'charge' }), null);
  });
});
