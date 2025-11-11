// ============================================
// CONFIGURACIÓN Y CONSTANTES DEL JUEGO
// ============================================

const GAME_CONFIG = {
  // Canvas
  CANVAS_WIDTH: 720,
  CANVAS_HEIGHT: 480,
  FPS: 60,

  // Controles (KeyCodes)
  KEYS: {
    // Movimiento
    UP: 87,      // W
    LEFT: 65,    // A
    DOWN: 83,    // S
    RIGHT: 68,   // D

    // Acciones
    SHOOT: 74,   // J
    SPECIAL: 75, // K
    PAUSE: 80,   // P
    ESC: 27,     // Escape
    ENTER: 13    // Enter
  },

  // Física
  FRICTION: 0.8,
  PLAYER_SPEED: 6,
  PLAYER_DASH_SPEED: 12,

  // Tamaños
  PLAYER_WIDTH: 100,
  PLAYER_HEIGHT: 100,
  BULLET_WIDTH: 30,
  BULLET_HEIGHT: 10,
  ENEMY_WIDTH: 100,
  ENEMY_HEIGHT: 100,

  // Velocidades
  BULLET_SPEED: 35,
  ENEMY_BULLET_SPEED: 30,
  ENEMY_SPEED: 1,
  BACKGROUND_SPEED: 1,

  // Spawn rates (en frames)
  ENEMY_SPAWN_RATE: 30,
  ENEMY_SHOOT_RATE: 90,

  // Gameplay
  PLAYER_MAX_HP: 100,
  PLAYER_DAMAGE: 10,
  BULLET_DAMAGE: 10,
  BULLET_DAMAGE_BOSS: 10,

  // Margen de los límites
  BOUNDARY_MARGIN: 10
};

// Estados del juego
const GAME_STATES = {
  MENU: 'menu',
  DIFFICULTY_SELECT: 'difficulty_select',
  PLAYING: 'playing',
  BOSS_INTRO: 'boss_intro',
  BOSS_FIGHT: 'boss_fight',
  PHASE_COMPLETE: 'phase_complete',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
};

// Niveles de dificultad
const DIFFICULTY = {
  EASY: {
    name: 'Piloto Novato',
    playerLives: 5,
    playerSpeed: 7,
    enemySpeedMultiplier: 0.8,
    enemyFireRateMultiplier: 1.5,
    bossHPMultiplier: 0.7,
    bulletSpeedMultiplier: 0.8,
    powerUpDropRate: 0.25
  },
  NORMAL: {
    name: 'Piloto Rebelde',
    playerLives: 3,
    playerSpeed: 6,
    enemySpeedMultiplier: 1.0,
    enemyFireRateMultiplier: 1.0,
    bossHPMultiplier: 1.0,
    bulletSpeedMultiplier: 1.0,
    powerUpDropRate: 0.15
  },
  HARD: {
    name: 'As de la Alianza',
    playerLives: 2,
    playerSpeed: 5,
    enemySpeedMultiplier: 1.3,
    enemyFireRateMultiplier: 0.7,
    bossHPMultiplier: 1.5,
    bulletSpeedMultiplier: 1.4,
    powerUpDropRate: 0.10
  }
};

// Fases del juego
const GAME_PHASES = [
  {
    id: 1,
    type: 'NORMAL_COMBAT',
    name: 'TIE Fighter Squadron',
    objective: 'Destruye 30 TIE Fighters',
    enemyCount: 30,
    enemyType: 'TIE_FIGHTER',
    spawnRate: 60
  },
  {
    id: 2,
    type: 'BOSS_FIGHT',
    name: 'Darth Vader - TIE Advanced',
    objective: 'Derrota al TIE Advanced',
    bossType: 'TIE_ADVANCED',
    bossHP: 300
  },
  {
    id: 3,
    type: 'NORMAL_COMBAT',
    name: 'Interceptor Assault',
    objective: 'Sobrevive a los Interceptores',
    enemyCount: 40,
    enemyType: 'TIE_INTERCEPTOR',
    spawnRate: 45
  },
  {
    id: 4,
    type: 'BOSS_FIGHT',
    name: 'Imperial Star Destroyer',
    objective: 'Destruye el Star Destroyer',
    bossType: 'STAR_DESTROYER',
    bossHP: 500
  },
  {
    id: 5,
    type: 'BOSS_FIGHT',
    name: 'Death Star',
    objective: 'Destruye el Puerto de Escape',
    bossType: 'DEATH_STAR',
    bossHP: 1000
  }
];

// Tipos de power-ups
const POWERUP_TYPES = {
  // Ofensivos
  DUAL_SHOT: { name: 'Dual Shot', dropRate: 0.15, duration: 10000, color: '#ff6600' },
  QUAD_SHOT: { name: 'Quad Shot', dropRate: 0.08, duration: 8000, color: '#ff0066' },
  LASER_BEAM: { name: 'Laser Beam', dropRate: 0.05, duration: 5000, color: '#ff0000' },
  HOMING_MISSILES: { name: 'Homing Missiles', dropRate: 0.03, count: 10, color: '#9900ff' },
  PROTON_TORPEDOES: { name: 'Proton Torpedoes', dropRate: 0.02, count: 3, color: '#0099ff' },

  // Defensivos
  ENERGY_SHIELD: { name: 'Energy Shield', dropRate: 0.12, duration: 5000, color: '#00ccff' },
  SPEED_BOOST: { name: 'Speed Boost', dropRate: 0.10, duration: 8000, color: '#ffff00' },
  PHASE_CLOAK: { name: 'Phase Cloak', dropRate: 0.04, duration: 4000, color: '#cc00ff' },
  BARREL_ROLL: { name: 'Barrel Roll', dropRate: 0.06, charges: 3, color: '#00ff99' },

  // Utilidad
  REPAIR_KIT: { name: 'Repair Kit', dropRate: 0.08, color: '#00ff00' },
  SMART_BOMB: { name: 'Smart Bomb', dropRate: 0.05, color: '#ff9900' },
  SLOW_MOTION: { name: 'Slow Motion', dropRate: 0.03, duration: 5000, color: '#6600ff' },
  AUTO_AIM: { name: 'Auto-Aim', dropRate: 0.10, duration: 10000, color: '#ff00ff' },
  OVERCHARGE: { name: 'Overcharge', dropRate: 0.02, duration: 8000, color: '#ffcc00' },
  FORCE_POWER: { name: 'Force Power', dropRate: 0.01, color: '#0066ff' }
};

// Puntuación
const SCORE_VALUES = {
  TIE_FIGHTER: 100,
  TIE_INTERCEPTOR: 150,
  TIE_ADVANCED: 1000,
  STAR_DESTROYER: 2500,
  DEATH_STAR: 10000,
  NO_DAMAGE_BONUS: 500,
  PHASE_COMPLETE_BONUS: 1000
};

// Assets (Imágenes y sonidos)
const ASSETS = {
  images: {
    board: 'images/zoey.png',
    player1: 'images/xwing2.png',
    player2: 'images/Player2.png',
    bullet1: 'images/bulletBuenos.png',
    bullet2: 'images/BulletMalos.png',
    enemy: 'images/Caza.png',
    // Health bars
    hpFull: 'images/Full.png',
    hp75: 'images/34.png',
    hp50: 'images/medium.png',
    hp25: 'images/Almost-done.png',
    hp0: 'images/Done.png',
    hpBlue: 'images/Blue.png',
    hpBlue1: 'images/Blue1.png',
    hpBlue2: 'images/Blue2.png',
    hpBlue3: 'images/Blue3.png',
    hpBlue4: 'images/Blue4.png'
  },

  sounds: {
    pewPew: 'Sounds/scifi002.mp3',
    mainTitle: 'Sounds/main-title.mp3',
    death: 'Sounds/R2D2.mp3'
    // Más sonidos se agregarán en fases posteriores
  }
};
