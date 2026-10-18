import { STORAGE_KEYS } from '../config.js';

/**
 * Envoltorio de un almacenamiento clave/valor. localStorage puede no existir o lanzar
 * (modo privado, Node); nunca debe romper el juego.
 */
export class Storage {
  constructor(backend = globalThis.localStorage) {
    this.backend = backend;
  }

  load(key, fallback = null) {
    try {
      const value = this.backend?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch {
      return fallback;
    }
  }

  save(key, value) {
    try {
      this.backend?.setItem(key, String(value));
    } catch {
      /* sin persistencia */
    }
  }

  get highScore() {
    return Number(this.load(STORAGE_KEYS.HIGH_SCORE, 0)) || 0;
  }

  set highScore(value) {
    this.save(STORAGE_KEYS.HIGH_SCORE, value);
  }

  get muted() {
    return this.load(STORAGE_KEYS.MUTED) === '1';
  }

  set muted(value) {
    this.save(STORAGE_KEYS.MUTED, value ? '1' : '0');
  }
}

/** Almacenamiento en memoria (pruebas o navegadores sin localStorage). */
export class MemoryBackend {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  setItem(key, value) {
    this.data.set(key, value);
  }
}
