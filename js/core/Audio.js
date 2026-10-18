import { load, save } from './storage.js';

/** Sonidos con polifonía simple (clona el nodo) y silencio global persistente. */
export class AudioManager {
  constructor(sounds, { forceMute = false } = {}) {
    this.sources = sounds;
    this.muted = forceMute || load('xwing.muted') === '1';
    this.listeners = [];
    this.music = new Audio(sounds.music);
    this.music.loop = true;
    this.music.volume = 0.35;
    this.lastPlayed = {};
  }

  play(name, { volume = 0.4, minGap = 0.05 } = {}) {
    if (this.muted || !this.sources[name]) return;
    const now = performance.now() / 1000;
    if (now - (this.lastPlayed[name] ?? 0) < minGap) return;
    this.lastPlayed[name] = now;
    const sfx = new Audio(this.sources[name]);
    sfx.volume = volume;
    sfx.play().catch(() => {});
  }

  startMusic() {
    if (this.muted) return;
    this.music.play().catch(() => {});
  }

  stopMusic() {
    this.music.pause();
    this.music.currentTime = 0;
  }

  onChange(listener) {
    this.listeners.push(listener);
    listener(this.muted);
  }

  /** `resumeMusic` indica si la música debe sonar al reactivar el audio (solo durante la partida). */
  toggleMute(resumeMusic) {
    this.muted = !this.muted;
    save('xwing.muted', this.muted ? '1' : '0');
    if (this.muted) this.music.pause();
    else if (resumeMusic) this.music.play().catch(() => {});
    this.listeners.forEach((fn) => fn(this.muted));
    return this.muted;
  }
}
