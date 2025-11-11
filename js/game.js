// ============================================
// GAME.JS - Entry point del juego
// ============================================

// Variables globales del juego
let gameManager;
let canvas;
let ctx;

/**
 * Inicializa el juego cuando la página carga
 */
window.onload = function() {
  console.log('🎮 Iniciando X-Wing: Asalto a la Estrella de la Muerte');

  // Obtener canvas y contexto
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  // Configurar tamaño del canvas
  canvas.width = GAME_CONFIG.CANVAS_WIDTH;
  canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

  // Crear el Game Manager
  gameManager = new GameManager(canvas, ctx);

  // Configurar botones del UI
  setupButtons();

  // Mostrar menú inicial
  gameManager.setState(GAME_STATES.MENU);

  console.log('✅ Juego inicializado correctamente');
};

/**
 * Configura los event listeners de los botones
 */
function setupButtons() {
  const startButton = document.getElementById('start-button');
  const restartButton = document.getElementById('restart-button');

  if (startButton) {
    startButton.onclick = function() {
      console.log('🚀 Iniciando juego...');
      gameManager.setState(GAME_STATES.PLAYING);
    };
  }

  if (restartButton) {
    restartButton.onclick = function() {
      console.log('🔄 Reiniciando juego...');
      gameManager.restart();
    };
  }
}
