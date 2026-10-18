// Configuración central del juego. Velocidades en px/s, tiempos en segundos.
// Todo valor de balance vive aquí: la lógica no debe contener números mágicos.

export const CANVAS = { WIDTH: 960, HEIGHT: 540 };

export const KEYS = {
  UP: ['KeyW', 'ArrowUp'],
  DOWN: ['KeyS', 'ArrowDown'],
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],
  SHOOT: ['KeyJ', 'Space'],
  TORPEDO: ['KeyK'],
  PAUSE: ['KeyP', 'Escape'],
  CONFIRM: ['Enter'],
  QUIT: ['KeyQ'],
  MUTE: ['KeyM'],
};

export const PLAYER = {
  WIDTH: 72,
  HEIGHT: 68,
  START_X: 80,
  MARGIN: 8,
  MAX_X_RATIO: 0.75, // no puede pasar del 75% del ancho
  ACCEL: 2600,
  MAX_SPEED: 360,
  FRICTION: 8,
  MAX_HP: 100,
  FIRE_COOLDOWN: 0.16,
  CANNON_OFFSET: 18, // distancia vertical de cada cañón al centro de la nave
  RAPID_FIRE_FACTOR: 0.5,
  HIT_INVULNERABILITY: 1,
  RESPAWN_INVULNERABILITY: 2.5,
  START_TORPEDOES: 2,
  MAX_TORPEDOES: 5,
};

export const BULLET = {
  PLAYER_SPEED: 900,
  PLAYER_DAMAGE: 10,
  TRIPLE_SPREAD: 0.22, // componente vertical relativa de los disparos laterales
  ENEMY_SPEED: 380,
  ENEMY_DAMAGE: 10,
  ENEMY_AIM_ERROR: 0.12, // radianes
};

/**
 * Cuánto se reduce por cada lado la hitbox del OBJETIVO (px). Más alto = más permisivo.
 * El jugador mide 72x68: con 16 su zona vulnerable a balas es el núcleo de 40x36.
 */
export const HITBOX = {
  ENEMY_VS_BULLET: 4,
  PLAYER_VS_BULLET: 16,
  PLAYER_VS_ENEMY: 12,
  PLAYER_VS_BOSS: 16,
  PLAYER_VS_LASER: 10,
};

/** Torpedo protón (tecla K): proyectil visible que explota con onda expansiva. */
export const TORPEDO = {
  SPEED: 520,
  SIZE: 16,
  MAX_FLIGHT: 1.4, // segundos antes de detonar solo
  BLAST_RADIUS: 170,
  CLEAR_BULLETS_RADIUS: 260,
  ENEMY_DAMAGE: 60,
  BOSS_DAMAGE: 120, // solo con impacto directo (en la Estrella de la Muerte, en el puerto)
};

export const COMBAT = {
  ENEMY_CONTACT_DAMAGE: 30,
  BOSS_CONTACT_DAMAGE: 25,
  BOSS_CLEAR_HEAL: 40,
  RESPAWN_DELAY: 1.5,
};

/**
 * aimLead: cuánto anticipa la IA el movimiento del jugador al apuntar (0 = dispara a donde está,
 * 1 = intercepción perfecta). dodge: multiplica la probabilidad de esquivar de cada enemigo.
 */
export const DIFFICULTIES = {
  EASY: { label: 'Piloto Novato', lives: 5, enemySpeed: 0.8, enemyFire: 0.7, bossHp: 0.7, dropRate: 0.25, aimLead: 0.25, dodge: 0.4 },
  NORMAL: { label: 'Piloto Rebelde', lives: 3, enemySpeed: 1, enemyFire: 1, bossHp: 1, dropRate: 0.15, aimLead: 0.7, dodge: 0.8 },
  HARD: { label: 'As de la Alianza', lives: 2, enemySpeed: 1.3, enemyFire: 1.4, bossHp: 1.5, dropRate: 0.1, aimLead: 1, dodge: 1 },
};
export const DEFAULT_DIFFICULTY = 'NORMAL';

/**
 * dodge.chance: probabilidad de intentar esquivar un láser que viene hacia él (× DIFFICULTY.dodge).
 * dodge.reaction: segundos de antelación con que detecta el láser. dodge.cooldown: pausa entre esquivas.
 */
export const ENEMY_TYPES = {
  TIE_FIGHTER: { hp: 20, speed: 140, fireRate: 0.5, score: 100, size: 56, wobble: 30, dodge: { chance: 0.15, reaction: 0.3, speed: 220, cooldown: 1.5 } },
  TIE_INTERCEPTOR: { hp: 30, speed: 220, fireRate: 0.8, score: 150, size: 50, wobble: 50, dodge: { chance: 0.55, reaction: 0.35, speed: 320, cooldown: 0.9 } },
};

/** Formaciones de escuadrón (ver sim/ai/formations.js). */
export const FORMATION = { V: 'V', COLUMN: 'COLUMN', PINCER: 'PINCER', DIVE: 'DIVE', ECHELON: 'ECHELON', STRAFE: 'STRAFE' };

export const BOSS = {
  ENTRY_SPEED: 160,
  DEATH_DURATION: 2.2,
};

export const BOSS_TYPES = {
  TIE_ADVANCED: { name: 'TIE Advanced x1 — Darth Vader', hp: 600, score: 3000, width: 110, height: 92 },
  STAR_DESTROYER: { name: 'Destructor Estelar clase Imperial', hp: 1200, score: 6000, width: 400, height: 190 },
  DEATH_STAR: { name: 'Estrella de la Muerte', hp: 700, score: 15000, width: 420, height: 420 },
};

export const PHASE_TYPE = { WAVE: 'WAVE', BOSS: 'BOSS' };

/**
 * Las oleadas llegan en escuadrones: se eligen de `squadrons` al azar según `weight` (sin repetir
 * el anterior) hasta generar `count` enemigos.
 */
export const PHASES = [
  {
    type: PHASE_TYPE.WAVE,
    name: 'Escuadrón TIE',
    objective: 'Destruye 20 TIE Fighters',
    enemy: 'TIE_FIGHTER',
    count: 20,
    squadronEvery: 3.2,
    squadrons: [
      { formation: FORMATION.V, size: 5, weight: 3 },
      { formation: FORMATION.COLUMN, size: 4, weight: 3 },
      { formation: FORMATION.PINCER, size: 4, weight: 2 },
      { formation: FORMATION.ECHELON, size: 4, weight: 2 },
      { formation: FORMATION.STRAFE, size: 2, weight: 1 },
    ],
  },
  { type: PHASE_TYPE.BOSS, name: 'Darth Vader', objective: 'Derriba el TIE Advanced', boss: 'TIE_ADVANCED' },
  {
    type: PHASE_TYPE.WAVE,
    name: 'Asalto Interceptor',
    objective: 'Destruye 30 Interceptores',
    enemy: 'TIE_INTERCEPTOR',
    count: 30,
    squadronEvery: 2.8,
    squadrons: [
      { formation: FORMATION.DIVE, size: 3, weight: 3 },
      { formation: FORMATION.PINCER, size: 4, weight: 2 },
      { formation: FORMATION.V, size: 5, weight: 2 },
      { formation: FORMATION.DIVE, size: 4, weight: 2 },
      { formation: FORMATION.ECHELON, size: 4, weight: 2 },
      { formation: FORMATION.STRAFE, size: 3, weight: 2 },
    ],
  },
  { type: PHASE_TYPE.BOSS, name: 'Destructor Estelar', objective: 'Destruye el Star Destroyer', boss: 'STAR_DESTROYER' },
  { type: PHASE_TYPE.BOSS, name: 'Estrella de la Muerte', objective: 'Dispara al puerto de escape', boss: 'DEATH_STAR' },
];

export const PHASE_BANNER_TIME = 2.5;

// `duration` en segundos = efecto temporal; el resto se aplica al instante (ver sim/powerups.js).
export const POWERUPS = {
  TRIPLE_SHOT: { label: 'Disparo triple', color: '#ff7a1a', icon: 'III', duration: 10, weight: 4 },
  RAPID_FIRE: { label: 'Fuego rápido', color: '#ff2e63', icon: '»', duration: 8, weight: 3 },
  SHIELD: { label: 'Escudo', color: '#22d3ee', icon: 'S', duration: 6, weight: 3 },
  REPAIR: { label: 'Reparación', color: '#4ade80', icon: '+', heal: 40, weight: 3 },
  TORPEDO: { label: 'Torpedo protón', color: '#facc15', icon: 'B', torpedoes: 1, weight: 2 },
};

export const POWERUP_ITEM = { SIZE: 28, DRIFT_SPEED: 60, LIFETIME: 10, BLINK_BEFORE_END: 3 };

export const SCORE = {
  POWERUP: 50,
  PHASE_CLEAR: 1000,
  NO_DAMAGE: 500,
};

export const ASSETS = {
  images: {
    player: 'images/xwing2.png',
    tie: 'images/Caza.png',
    background: 'images/zoey.png',
  },
  sounds: {
    shoot: 'Sounds/scifi002.mp3',
    music: 'Sounds/main-title.mp3',
    death: 'Sounds/R2D2.mp3',
  },
};

export const STORAGE_KEYS = { HIGH_SCORE: 'xwing.highscore', MUTED: 'xwing.muted' };

/** Escala máxima del canvas en pantallas HiDPI (retina). Más alta = más nítido pero más costoso. */
export const MAX_RENDER_SCALE = 2;
