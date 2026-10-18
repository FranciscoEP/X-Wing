import { ASSETS, PHASES, RENDER } from './config.js';
import { loadImages } from './core/assets.js';
import { AudioManager } from './core/Audio.js';
import { CombinedInput } from './core/CombinedInput.js';
import { Input } from './core/Input.js';
import { Storage } from './core/storage.js';
import { TouchInput } from './core/TouchInput.js';
import { Game } from './Game.js';
import { spriteToDataUrl } from './render/art/SpriteCache.js';
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

/**
 * Escala entera del visor: el búfer de 480×270 se amplía ×2, ×3, ×4… para que cada píxel del
 * juego ocupe exactamente N píxeles de pantalla (pixel perfect). La interfaz usa la misma
 * unidad (--px) para que HUD y menús compartan la cuadrícula del juego. En pantallas más chicas
 * que 480 px se usa una escala fraccionaria.
 */
function fitViewport(viewport) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const availW = window.innerWidth - 32;
  const availH = window.innerHeight - (touch ? 32 : 96);
  const fit = Math.min(availW / RENDER.WIDTH, availH / RENDER.HEIGHT);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  viewport.style.setProperty('--px', `${scale}px`);
  viewport.style.width = `${RENDER.WIDTH * scale}px`;
}

async function boot() {
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('game');
  fitViewport(viewport);
  window.addEventListener('resize', () => fitViewport(viewport));

  const [images] = await Promise.all([
    loadImages(ASSETS.images),
    // La tipografía pixel también se usa dentro del canvas (puntos, iconos): hay que esperarla
    document.fonts?.load('8px "Press Start 2P"').catch(() => {}),
  ]);

  const storage = new Storage();
  const renderer = new Renderer({ canvas, images });
  const game = new Game({
    input: createInput(viewport),
    // `?silencio` arranca sin audio (útil para pruebas)
    audio: new AudioManager(ASSETS.sounds, { storage, forceMute: params.has('silencio') }),
    renderer,
    storage,
    startPhase: startPhaseFromUrl(),
  });

  game.ui = new CockpitUI(viewport, {
    playerIcon: spriteToDataUrl(renderer.sprites.player),
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
