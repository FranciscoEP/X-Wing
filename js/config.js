// Configuración central del juego. Velocidades en px/s, tiempos en segundos.

export const CANVAS = { WIDTH: 960, HEIGHT: 540 };

export const KEYS = {
  UP: ['KeyW', 'ArrowUp'],
  DOWN: ['KeyS', 'ArrowDown'],
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],
  SHOOT: ['KeyJ', 'Space'],
  BOMB: ['KeyK'],
  PAUSE: ['KeyP', 'Escape'],
  CONFIRM: ['Enter'],
  MUTE: ['KeyM'],
};

export const PLAYER = {
  WIDTH: 72,
  HEIGHT: 68,
  ACCEL: 2600,
  MAX_SPEED: 360,
  FRICTION: 8,
  MAX_HP: 100,
  FIRE_COOLDOWN: 0.16,
  HIT_INVULNERABILITY: 1,
  RESPAWN_INVULNERABILITY: 2.5,
  START_BOMBS: 2,
};

export const BULLET = {
  PLAYER_SPEED: 900,
  PLAYER_DAMAGE: 10,
  ENEMY_SPEED: 380,
  ENEMY_DAMAGE: 10,
};

export const DIFFICULTIES = {
  EASY: { label: 'Piloto Novato', lives: 5, enemySpeed: 0.8, enemyFire: 0.7, bossHp: 0.7, dropRate: 0.25 },
  NORMAL: { label: 'Piloto Rebelde', lives: 3, enemySpeed: 1, enemyFire: 1, bossHp: 1, dropRate: 0.15 },
  HARD: { label: 'As de la Alianza', lives: 2, enemySpeed: 1.3, enemyFire: 1.4, bossHp: 1.5, dropRate: 0.1 },
};

export const ENEMY_TYPES = {
  TIE_FIGHTER: { hp: 20, speed: 140, fireRate: 0.5, score: 100, size: 56, wobble: 30 },
  TIE_INTERCEPTOR: { hp: 30, speed: 220, fireRate: 0.8, score: 150, size: 50, wobble: 70 },
};

export const PHASES = [
  { type: 'WAVE', name: 'Escuadrón TIE', objective: 'Destruye 20 TIE Fighters', enemy: 'TIE_FIGHTER', count: 20, spawnEvery: 0.9 },
  { type: 'BOSS', name: 'Darth Vader', objective: 'Derriba el TIE Advanced', boss: 'TIE_ADVANCED' },
  { type: 'WAVE', name: 'Asalto Interceptor', objective: 'Destruye 30 Interceptores', enemy: 'TIE_INTERCEPTOR', count: 30, spawnEvery: 0.7 },
  { type: 'BOSS', name: 'Destructor Estelar', objective: 'Destruye el Star Destroyer', boss: 'STAR_DESTROYER' },
  { type: 'BOSS', name: 'Estrella de la Muerte', objective: 'Dispara al puerto de escape', boss: 'DEATH_STAR' },
];

// duration en segundos; los que no tienen duración son instantáneos.
export const POWERUPS = {
  TRIPLE_SHOT: { label: 'Disparo triple', color: '#ff7a1a', icon: 'III', duration: 10, weight: 4 },
  RAPID_FIRE: { label: 'Fuego rápido', color: '#ff2e63', icon: '»', duration: 8, weight: 3 },
  SHIELD: { label: 'Escudo', color: '#22d3ee', icon: 'S', duration: 6, weight: 3 },
  REPAIR: { label: 'Reparación', color: '#4ade80', icon: '+', weight: 3 },
  BOMB: { label: 'Torpedo protón', color: '#facc15', icon: 'B', weight: 2 },
};

export const SCORE = {
  POWERUP: 50,
  PHASE_CLEAR: 1000,
  NO_DAMAGE: 500,
};

export const ASSETS = {
  images: {
    player: 'images/xwing2.png',
    tie: 'images/Caza.png',
    playerBullet: 'images/bulletBuenos.png',
    enemyBullet: 'images/BulletMalos.png',
    background: 'images/zoey.png',
  },
  sounds: {
    shoot: 'Sounds/scifi002.mp3',
    music: 'Sounds/main-title.mp3',
    death: 'Sounds/R2D2.mp3',
  },
};

export const STORAGE_KEY = 'xwing.highscore';
