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

function setupMuteButton(game) {
  const button = document.getElementById('mute-button');
  game.audio.onChange((muted) => {
    button.textContent = muted ? '🔇 Sonido: no' : '🔊 Sonido: sí';
    button.setAttribute('aria-pressed', String(muted));
  });
  button.addEventListener('click', () => {
    game.toggleMute();
    // Devolver el foco al canvas para que el teclado siga controlando la nave
    document.getElementById('game').focus();
  });
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
    // `?silencio` arranca sin audio (útil para pruebas)
    audio: new AudioManager(ASSETS.sounds, { forceMute: new URLSearchParams(location.search).has('silencio') }),
    input: new Input(),
    startPhase: startPhaseFromUrl(),
  });
  setupMuteButton(game);
  document.body.classList.add('ready');
  canvas.focus();
  game.start();
}

boot();
