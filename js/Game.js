import { DEFAULT_DIFFICULTY, DIFFICULTIES, KEYS } from './config.js';
import { EventBus } from './core/EventBus.js';
import { bindAudioFeedback } from './render/feedback.js';
import { SCENE } from './render/Renderer.js';
import { OUTCOME, World } from './sim/World.js';

const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);
const MAX_DT = 1 / 30; // evita saltos enormes tras cambiar de pestaña

/**
 * Máquina de estados de la aplicación (menú → partida ↔ pausa → fin) y bucle principal.
 * No toca el DOM: recibe input, audio, renderer y storage ya construidos (ver main.js),
 * por eso se puede probar con dobles.
 */
export class Game {
  constructor({ input, audio, renderer, storage, startPhase = 0 }) {
    this.input = input;
    this.audio = audio;
    this.renderer = renderer;
    this.storage = storage;
    this.startPhase = startPhase;

    this.state = SCENE.MENU;
    this.difficultyKey = DEFAULT_DIFFICULTY;
    this.highScore = storage.highScore;
    this.newRecord = false;
    this.time = 0;
    this.world = null;
  }

  get difficulty() {
    return DIFFICULTIES[this.difficultyKey];
  }

  // ------------------------------------------------------------ bucle

  start(raf = requestAnimationFrame, now = () => performance.now()) {
    let last = now();
    const frame = (t) => {
      this.step(Math.min((t - last) / 1000, MAX_DT));
      last = t;
      raf(frame);
    };
    raf(frame);
  }

  /** Un frame completo: lógica + dibujo. */
  step(dt) {
    this.update(dt);
    this.renderer?.render(this.scene());
    this.input.endFrame();
  }

  update(dt) {
    this.time += dt;
    if (this.input.consume(KEYS.MUTE)) this.toggleMute();

    switch (this.state) {
      case SCENE.MENU:
        this.updateMenu();
        break;
      case SCENE.PLAYING:
        if (this.input.consume(KEYS.PAUSE)) return this.pause();
        this.world.update(dt, this.input.readControls());
        break;
      case SCENE.PAUSED:
        if (this.input.consume(KEYS.PAUSE)) this.state = SCENE.PLAYING;
        else if (this.input.consume(KEYS.QUIT)) this.toMenu();
        return; // en pausa no avanza nada, ni siquiera el fondo
      case SCENE.GAME_OVER:
      case SCENE.VICTORY:
        if (this.input.consume(KEYS.CONFIRM)) this.toMenu();
        break;
    }
    this.renderer?.update(dt, { bossActive: Boolean(this.world?.boss) });
  }

  scene() {
    return {
      state: this.state,
      time: this.time,
      world: this.world,
      difficulty: this.difficultyKey,
      highScore: this.highScore,
      newRecord: this.newRecord,
      muted: this.audio.muted,
    };
  }

  // ------------------------------------------------------- transiciones

  updateMenu() {
    const i = DIFFICULTY_KEYS.indexOf(this.difficultyKey);
    const n = DIFFICULTY_KEYS.length;
    if (this.input.consume(KEYS.UP)) this.difficultyKey = DIFFICULTY_KEYS[(i + n - 1) % n];
    if (this.input.consume(KEYS.DOWN)) this.difficultyKey = DIFFICULTY_KEYS[(i + 1) % n];
    if (this.input.consume(KEYS.CONFIRM) || this.input.consume(KEYS.SHOOT)) this.startRun();
  }

  startRun() {
    const events = new EventBus();
    this.world = new World({ difficulty: this.difficulty, events });
    this.renderer?.attach(this.world);
    bindAudioFeedback(events, this.audio);
    events.on('gameOver', ({ outcome }) => this.endRun(outcome));

    this.newRecord = false;
    this.state = SCENE.PLAYING;
    this.world.start(this.startPhase);
    this.audio.startMusic();
  }

  pause() {
    if (this.state === SCENE.PLAYING) this.state = SCENE.PAUSED;
  }

  endRun(outcome) {
    this.state = outcome === OUTCOME.VICTORY ? SCENE.VICTORY : SCENE.GAME_OVER;
    if (this.world.score > this.highScore) {
      this.highScore = this.world.score;
      this.storage.highScore = this.highScore;
      this.newRecord = true;
    }
    this.audio.stopMusic();
  }

  toMenu() {
    this.audio.stopMusic();
    this.world = null;
    this.state = SCENE.MENU;
  }

  toggleMute() {
    const inRun = this.state === SCENE.PLAYING || this.state === SCENE.PAUSED;
    this.audio.toggleMute(inRun);
  }
}
