import { ASSETS, CANVAS, PHASES } from './config.js';
import { loadImages } from './core/assets.js';
import { AudioManager } from './core/Audio.js';
import { CombinedInput } from './core/CombinedInput.js';
import { Input } from './core/Input.js';
import { Storage } from './core/storage.js';
import { TouchInput } from './core/TouchInput.js';
import { Game } from './Game.js';
import { Renderer } from './render/Renderer.js';
import { CockpitUI } from './ui/CockpitUI.js';

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

/** Teclado + controles táctiles (solo se ven en pantallas táctiles, ver style.css). */
function createInput(viewport) {
  const touch = (name) => viewport.querySelector(`[data-touch='${name}']`);
  const touchInput = new TouchInput({
    surface: viewport,
    stick: touch('stick'),
    fire: touch('fire'),
    torpedo: touch('torpedo'),
  });
  return new CombinedInput(new Input(window), touchInput);
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
  const viewport = document.getElementById('viewport');
  const game = new Game({
    input: createInput(viewport),
    // `?silencio` arranca sin audio (útil para pruebas)
    audio: new AudioManager(ASSETS.sounds, { storage, forceMute: params.has('silencio') }),
    renderer: new Renderer(canvas.getContext('2d'), images),
    storage,
    startPhase: startPhaseFromUrl(),
  });

  game.ui = new CockpitUI(viewport, {
    playerIcon: ASSETS.images.player,
    actions: {
      start: () => game.retry(),
      resume: () => game.resume(),
      pause: () => game.pause(),
      menu: () => game.toMenu(),
      selectDifficulty: (key) => game.selectDifficulty(key),
    },
    // Tras usar el ratón, el foco vuelve al canvas: así Espacio dispara en vez de pulsar el botón
    onAction: () => canvas.focus(),
  });

  // `?debug` expone el juego en la consola (window.xwing) para pruebas manuales
  if (params.has('debug')) window.xwing = game;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.pause();
  });
  setupMuteButton(game, canvas);
  canvas.focus();
  game.start();
}

boot();
