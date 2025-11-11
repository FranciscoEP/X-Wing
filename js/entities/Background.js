// ============================================
// BACKGROUND - Fondo con efecto parallax
// ============================================

class Background {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = GAME_CONFIG.CANVAS_WIDTH;
    this.height = GAME_CONFIG.CANVAS_HEIGHT;
    this.speed = GAME_CONFIG.BACKGROUND_SPEED;

    // Sprite
    this.img = new Image();
    this.img.src = ASSETS.images.board;
    this.loaded = false;

    this.img.onload = () => {
      this.loaded = true;
    };
  }

  update() {
    this.x -= this.speed;

    // Reset cuando se completa el ciclo
    if (this.x <= -this.width) {
      this.x = 0;
    }
  }

  draw(ctx) {
    if (!this.loaded) return;

    // Dibujar dos imágenes para efecto continuo
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    ctx.drawImage(this.img, this.x + this.width, this.y, this.width, this.height);
  }
}
