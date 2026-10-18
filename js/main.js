import { ASSETS, CANVAS, PHASES } from './config.js';
import { loadImages } from './core/assets.js';
import { AudioManager } from './core/Audio.js';
import { Input } from './core/Input.js';
import { Game } from './Game.js';

/** `?fase=4` empieza directamente en esa fase (útil para probar jefes). */
function startPhaseFromUrl() {
  const n = Number(new URLSearchParams(location.search).get('fase'));
  return Number.isInteger(n) && n >= 1 && n <= PHASES.length ? n - 1 : 0;
}

async function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS.WIDTH;
  canvas.height = CANVAS.HEIGHT;

  const [images] = await Promise.all([
    loadImages(ASSETS.images),
    // Esperar a la fuente evita que el primer frame se dibuje con la tipografía por defecto
    document.fonts?.load('bold 16px "Orbitron"').catch(() => {}),
  ]);

  const game = new Game(canvas, {
    images,
    audio: new AudioManager(ASSETS.sounds),
    input: new Input(),
    startPhase: startPhaseFromUrl(),
  });
  document.body.classList.add('ready');
  canvas.focus();
  game.start();
}

boot();
