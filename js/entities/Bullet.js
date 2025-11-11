// ============================================
// BULLET - Proyectiles del jugador
// ============================================

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = GAME_CONFIG.BULLET_WIDTH;
    this.height = GAME_CONFIG.BULLET_HEIGHT;
    this.speed = GAME_CONFIG.BULLET_SPEED;

    // Sprite
    this.img = new Image();
    this.img.src = ASSETS.images.bullet1;

    // Estado
    this.active = true;
    this.damage = GAME_CONFIG.BULLET_DAMAGE;
  }

  update() {
    this.x += this.speed;

    // Desactivar si sale de la pantalla
    if (this.x > GAME_CONFIG.CANVAS_WIDTH + 50) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  isOffScreen() {
    return !this.active || this.x > GAME_CONFIG.CANVAS_WIDTH + 50;
  }

  isColliding(other) {
    if (!this.active) return false;
    return Utils.isColliding(this, other);
  }

  destroy() {
    this.active = false;
  }
}
