// Configuración central del juego. Velocidades en px/s, tiempos en segundos.
// Todo valor de balance vive aquí: la lógica no debe contener números mágicos.

// La simulación usa un espacio de 960×540 unidades; se dibuja en un búfer pixel de 480×270
// (RENDER.SCALE = 0.5) que el navegador amplía sin suavizar: pixel art de 16 bits.
export const CANVAS = { WIDTH: 960, HEIGHT: 540 };
export const RENDER = { WIDTH: 480, HEIGHT: 270, SCALE: 0.5 };

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
 * Palancas de dificultad (todas multiplicadores salvo que se indique):
 * - lives: naves · dropRate: probabilidad de power-up por derribo
 * - enemySpeed / enemyFire: velocidad y cadencia de los cazas
 * - aimLead (0..1): cuánto anticipan tu movimiento al apuntar · aimError: imprecisión en radianes
 * - bulletSpeed / damage: velocidad y daño de las balas enemigas
 * - dodge: probabilidad de esquivar (× la de cada caza)
 * - bossHp / bossPace: vida de los jefes y velocidad de todo su comportamiento (ataques incluidos)
 * - squadronPace / squadronBonus: frecuencia de escuadrones y naves extra en cada uno
 * - enemyReturns: cuántas veces vuelve un caza que sale de la pantalla sin ser derribado
 * Se calibran con el piloto experto: `npm run balance` (metas en tests/balance.test.js).
 */
export const DIFFICULTIES = {
  EASY: {
    label: 'Piloto Novato',
    lives: 5,
    dropRate: 0.25,
    enemySpeed: 0.8,
    enemyFire: 0.7,
    aimLead: 0.25,
    aimError: 0.16,
    bulletSpeed: 0.85,
    damage: 0.8,
    dodge: 0.4,
    bossHp: 0.7,
    bossPace: 0.85,
    squadronPace: 0.85,
    enemyReturns: 0,
    squadronBonus: 0,
  },
  NORMAL: {
    label: 'Piloto Rebelde',
    lives: 3,
    dropRate: 0.15,
    enemySpeed: 1,
    enemyFire: 1.4,
    aimLead: 0.7,
    aimError: 0.04,
    bulletSpeed: 1.15,
    damage: 1.7,
    dodge: 0.8,
    bossHp: 1.1,
    bossPace: 1.25,
    squadronPace: 1.25,
    enemyReturns: 1,
    squadronBonus: 1,
  },
  HARD: {
    label: 'As de la Alianza',
    lives: 2,
    dropRate: 0.1,
    enemySpeed: 1.3,
    enemyFire: 1.6,
    aimLead: 1,
    aimError: 0.03,
    bulletSpeed: 1.25,
    damage: 1.8,
    dodge: 1,
    bossHp: 1.5,
    bossPace: 1.3,
    squadronPace: 1.35,
    enemyReturns: 2,
    squadronBonus: 1,
  },
};
export const DEFAULT_DIFFICULTY = 'NORMAL';

/**
 * dodge.chance: probabilidad de intentar esquivar un láser que viene hacia él (× DIFFICULTY.dodge).
 * dodge.reaction: segundos de antelación con que detecta el láser. dodge.cooldown: pausa entre esquivas.
 */
export const ENEMY_TYPES = {
  TIE_FIGHTER: { hp: 20, speed: 140, fireRate: 0.5, score: 100, size: 56, wobble: 30, weapon: 'TWIN', returns: true, dodge: { chance: 0.15, reaction: 0.3, speed: 220, cooldown: 1.5 } },
  TIE_INTERCEPTOR: { hp: 30, speed: 220, fireRate: 0.8, score: 150, size: 50, wobble: 50, weapon: 'FAN', returns: true, dodge: { chance: 0.55, reaction: 0.35, speed: 320, cooldown: 0.9 } },
  TIE_BOMBER: { hp: 60, speed: 70, fireRate: 0.45, score: 250, size: 62, wobble: 12, weapon: 'MINES', dodge: { chance: 0, reaction: 0, speed: 0, cooldown: 0 } },
  // Anclada a la pared de la trinchera: se desplaza con ella (sim/trench/Trench.js)
  TRENCH_TURRET: { hp: 20, speed: 180, fireRate: 0.45, score: 120, size: 40, wobble: 0, weapon: 'TRIO', dodge: { chance: 0, reaction: 0, speed: 0, cooldown: 0 } },
};

/**
 * Firma de ataque de cada enemigo (sim/ai/weapons.js). Distancias en unidades de simulación.
 * TWIN: par de láseres rectos, solo cuando te tiene enfrente, con 0,3 s de aviso.
 * FAN: abanico al cruzar tu altura, una vez por pasada.
 * MINES: suelta minas cada `every` / enemyFire segundos.
 */
export const WEAPONS = {
  TWIN: { align: 40, charge: 0.3, gap: 10, cooldownMin: 0.8, cooldownMax: 1.6, speedFactor: 1.1 },
  FAN: { align: 60, count: 3, spread: 0.35, shots: 1 },
  MINES: { every: 2.2, firstMin: 0.6, firstMax: 1.4, minDistance: 120 },
  TRIO: { every: 1.8, firstMin: 0.4, firstMax: 1.2, charge: 0.5, count: 3, spread: 0.18, speedFactor: 0.75 },
};

/** Mina del TIE Bomber: flota `lifetime` s y estalla; si te acercas, se arma con `fuse` s de margen. */
export const MINE = { size: 22, hp: 10, lifetime: 4, drift: 30, proximity: 44, fuse: 0.35, radius: 90, damage: 25, score: 25 };

/**
 * Cazas que vuelven (ENEMY_TYPES.returns): al salir de la pantalla sin ser derribados dan la vuelta
 * y regresan por la derecha tras `delay` s. Los últimos `warn` s una flecha marca por dónde entrarán.
 */
export const RETURN = { delay: 1.4, warn: 0.7, minY: 60, maxY: CANVAS.HEIGHT - 150 };

/** Formaciones de escuadrón (ver sim/ai/formations.js). */
export const FORMATION = { V: 'V', COLUMN: 'COLUMN', PINCER: 'PINCER', DIVE: 'DIVE', ECHELON: 'ECHELON', STRAFE: 'STRAFE', SLASH: 'SLASH' };

export const BOSS = {
  ENTRY_SPEED: 160,
  DEATH_DURATION: 2.2,
};

export const BOSS_TYPES = {
  TIE_ADVANCED: { name: 'TIE Advanced x1 — Darth Vader', hp: 600, score: 3000, width: 80, height: 68 },
  // hp del Destructor: la suma de sus partes (sim/bosses/StarDestroyer.js)
  STAR_DESTROYER: { name: 'Destructor Estelar clase Imperial', hp: 830, score: 6000, width: 520, height: 260 },
};

export const PHASE_TYPE = { WAVE: 'WAVE', BOSS: 'BOSS', TRENCH: 'TRENCH' };

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
    // Mezcla de firmas: Interceptores que cruzan en diagonal, Bombers que minan la zona y TIE de apoyo.
    // `enemy` en un escuadrón cambia el tipo de nave respecto al de la fase.
    type: PHASE_TYPE.WAVE,
    name: 'Asalto imperial',
    objective: 'Destruye 26 cazas imperiales',
    enemy: 'TIE_INTERCEPTOR',
    count: 26,
    squadronEvery: 2.8,
    squadrons: [
      { formation: FORMATION.SLASH, size: 2, weight: 3 },
      { formation: FORMATION.SLASH, size: 3, weight: 2 },
      { formation: FORMATION.COLUMN, size: 2, enemy: 'TIE_BOMBER', weight: 2 },
      { formation: FORMATION.V, size: 3, enemy: 'TIE_FIGHTER', weight: 1 },
      { formation: FORMATION.STRAFE, size: 2, enemy: 'TIE_FIGHTER', weight: 1 },
    ],
  },
  { type: PHASE_TYPE.BOSS, name: 'Destructor Estelar', objective: 'Destruye sus torretas y luego el puente', boss: 'STAR_DESTROYER' },
  {
    // Final contra el reloj (sim/trench/Trench.js): entrada tranquila, torretas en las paredes,
    // Vader detrás y el puerto de escape, que solo cae con un torpedo antes de que acabe la cuenta.
    type: PHASE_TYPE.TRENCH,
    name: 'La trinchera',
    objective: 'Torpedo al puerto de escape antes de 60 s',
  },
];

export const PHASE_BANNER_TIME = 2.5;

/**
 * Carrera por la trinchera (tiempos en segundos desde que empieza la fase).
 * duration: cuenta regresiva hasta el superláser · calm: entrada sin torretas (respiro) ·
 * vaderAt / portAt: cuándo aparecen Vader y el puerto · top/bottom: bordes del pasillo.
 */
export const TRENCH = {
  duration: 60,
  calm: 10,
  vaderAt: 20,
  portAt: 38,
  speed: 180,
  top: 110,
  bottom: 430,
  minPlayerX: 90,
  turretEvery: 1.0,
  turretJitter: 0.5,
  torpedoRefill: 2,
  portScore: 25000,
};

/** Puerto de escape: solo un torpedo lo destruye; los láseres rebotan. */
export const PORT = { width: 36, height: 36, stopXRatio: 0.72, speed: 120 };

/** Vader persiguiendo desde atrás en la trinchera: pares hacia delante con aviso. */
export const TRENCH_VADER = { x: -36, follow: 1.6, every: 1.7, charge: 0.45, gap: 12, speedFactor: 1.2 };

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
  // Las naves son pixel art dibujado por código (render/art/pixelArt.js); solo el fondo es imagen
  images: {
    background: 'images/zoey.png',
  },
  sounds: {
    shoot: 'Sounds/scifi002.mp3',
    music: 'Sounds/main-title.mp3',
    death: 'Sounds/R2D2.mp3',
  },
};

export const STORAGE_KEYS = { HIGH_SCORE: 'xwing.highscore', MUTED: 'xwing.muted' };
