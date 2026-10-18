import { ASSETS, CANVAS, PHASES } from './config.js';
import { loadImages } from './core/assets.js';
import { AudioManager } from './core/Audio.js';
import { Input } from './core/Input.js';
import { Storage } from './core/storage.js';
import { Game } from './Game.js';
import { Renderer } from './render/Renderer.js';

// Único punto de contacto con el DOM: construye las dependencias y se las pasa a Game.

const params = new URLSearchParams(location.search);

/** `?fase=4` empieza directamente en esa fase (útil para probar jefes). */
function startPhaseFromUrl() {
  const n = Number(params.get('fase'));
  return Number.isInteger(n) && n >= 1 && n <= PHASES.length ? n - 1 : 0;
}

function setupMuteButton(game, canvas) {
  const button = document.getElementById('mute-button');
  game.audio.onChange((muted) => {
    button.textContent = muted ? '🔇 Sonido: no' : '🔊 Sonido: sí';
    button.setAttribute('aria-pressed', String(muted));
  });
  button.addEventListener('click', () => {
    game.toggleMute();
    canvas.focus(); // que el teclado siga controlando la nave
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

  const storage = new Storage();
  const game = new Game({
    input: new Input(window),
    // `?silencio` arranca sin audio (útil para pruebas)
    audio: new AudioManager(ASSETS.sounds, { storage, forceMute: params.has('silencio') }),
    renderer: new Renderer(canvas.getContext('2d'), images),
    storage,
    startPhase: startPhaseFromUrl(),
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.pause();
  });
  setupMuteButton(game, canvas);
  document.body.classList.add('ready');
  canvas.focus();
  game.start();
}

boot();
