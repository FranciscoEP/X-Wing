// ============================================
// ENEMY - TIE Fighter básico
// ============================================

class Enemy {
  constructor(x, y, type = 'TIE_FIGHTER') {
    this.x = x;
    this.y = y;
    this.width = GAME_CONFIG.ENEMY_WIDTH;
    this.height = GAME_CONFIG.ENEMY_HEIGHT;
    this.type = type;

    // Sprite
    this.img = new Image();
    this.img.src = ASSETS.images.enemy;

    // Stats según tipo
    this.speed = GAME_CONFIG.ENEMY_SPEED;
    this.hp = 10;
    this.scoreValue = SCORE_VALUES.TIE_FIGHTER;

    if (type === 'TIE_INTERCEPTOR') {
      this.speed = GAME_CONFIG.ENEMY_SPEED * 1.5;
      this.hp = 15;
      this.scoreValue = SCORE_VALUES.TIE_INTERCEPTOR;
    }

    // Estado
    this.active = true;
    this.shootTimer = 0;
    this.shootDelay = 90; // frames entre disparos
  }

  update() {
    // Mover hacia la izquierda
    this.x -= this.speed;

    // Desactivar si sale de la pantalla
    if (this.x < -this.width - 50) {
      this.active = false;
    }

    // Cooldown de disparo
    if (this.shootTimer > 0) {
      this.shootTimer--;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  shoot() {
    if (this.shootTimer > 0 || !this.active) return null;

    this.shootTimer = this.shootDelay;

    // TIE Fighters disparan 3 balas espaciadas
    const bullets = [];
    bullets.push(new EnemyBullet(this.x - 100, this.y + 20));
    bullets.push(new EnemyBullet(this.x - 200, this.y + 40));
    bullets.push(new EnemyBullet(this.x, this.y + 60));

    return bullets;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
      return true; // Murió
    }
    return false;
  }

  destroy() {
    this.active = false;
  }

  isOffScreen() {
    return !this.active || this.x < -this.width - 50;
  }

  isColliding(other) {
    if (!this.active) return false;
    return Utils.isColliding(this, other);
  }
}
