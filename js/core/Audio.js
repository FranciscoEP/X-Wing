const VOICES_PER_SOUND = 4;

/**
 * Música y efectos con silencio global persistente.
 * Cada efecto usa un pool fijo de elementos de audio que se reutilizan en ronda: así no se
 * crea un objeto nuevo por disparo (antes se generaban ~12 por segundo para el recolector).
 * `createAudio` es inyectable para poder probarlo sin navegador.
 */
export class AudioManager {
  constructor(sounds, { storage, forceMute = false, createAudio = (src) => new Audio(src), now = () => performance.now() / 1000 }) {
    this.sources = sounds;
    this.storage = storage;
    this.createAudio = createAudio;
    this.now = now;
    this.muted = forceMute || storage.muted;
    this.listeners = [];
    this.music = createAudio(sounds.music);
    this.music.loop = true;
    this.music.volume = 0.35;
    this.lastPlayed = {};
    this.pools = {};
  }

  /** Siguiente voz libre (en ronda) del pool de `name`, creándolo la primera vez. */
  voice(name) {
    const pool = (this.pools[name] ??= { voices: [], next: 0 });
    if (pool.voices.length < VOICES_PER_SOUND) {
      pool.voices.push(this.createAudio(this.sources[name]));
      return pool.voices.at(-1);
    }
    const voice = pool.voices[pool.next];
    pool.next = (pool.next + 1) % VOICES_PER_SOUND;
    voice.currentTime = 0;
    return voice;
  }

  play(name, { volume = 0.4, minGap = 0.05 } = {}) {
    if (this.muted || !this.sources[name]) return;
    const now = this.now();
    if (now - (this.lastPlayed[name] ?? -Infinity) < minGap) return;
    this.lastPlayed[name] = now;
    const sfx = this.voice(name);
    sfx.volume = volume;
    sfx.play()?.catch?.(() => {});
  }

  startMusic() {
    if (this.muted) return;
    this.music.play()?.catch?.(() => {});
  }

  stopMusic() {
    this.music.pause();
    this.music.currentTime = 0;
  }

  onChange(listener) {
    this.listeners.push(listener);
    listener(this.muted);
  }

  /** `resumeMusic` indica si la música debe volver a sonar al reactivar el audio. */
  toggleMute(resumeMusic) {
    this.muted = !this.muted;
    this.storage.muted = this.muted;
    if (this.muted) this.music.pause();
    else if (resumeMusic) this.music.play()?.catch?.(() => {});
    this.listeners.forEach((fn) => fn(this.muted));
    return this.muted;
  }
}
