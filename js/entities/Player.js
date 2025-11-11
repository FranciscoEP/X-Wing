// ============================================
// PLAYER - Jugador único (X-Wing)
// ============================================

class Player {
  constructor(x, y, sprite) {
    this.x = x;
    this.y = y;
    this.width = GAME_CONFIG.PLAYER_WIDTH;
    this.height = GAME_CONFIG.PLAYER_HEIGHT;

    // Sprite
    this.img = new Image();
    this.img.src = sprite;

    // Stats
    this.hp = GAME_CONFIG.PLAYER_MAX_HP;
    this.maxHP = GAME_CONFIG.PLAYER_MAX_HP;
    this.lives = 3; // Se configurará desde GameManager
    this.speed = GAME_CONFIG.PLAYER_SPEED;

    // Física
    this.velX = 0;
    this.velY = 0;
    this.friction = GAME_CONFIG.FRICTION;

    // Power-ups activos
    this.activePowerUps = [];

    // Estado
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.isDead = false;

    // Disparo
    this.shootCooldown = 0;
    this.shootDelay = 10; // frames entre disparos
  }

  update(keys) {
    if (this.isDead) return;

    // Movimiento con WASD
    if (keys[GAME_CONFIG.KEYS.RIGHT]) { // D
      if (this.velX < this.speed) {
        this.velX++;
      }
    }
    if (keys[GAME_CONFIG.KEYS.LEFT]) { // A
      if (this.velX > -this.speed) {
        this.velX--;
      }
    }
    if (keys[GAME_CONFIG.KEYS.DOWN]) { // S
      if (this.velY < this.speed) {
        this.velY++;
      }
    }
    if (keys[GAME_CONFIG.KEYS.UP]) { // W
      if (this.velY > -this.speed) {
        this.velY--;
      }
    }

    // Aplicar fricción
    this.velX *= this.friction;
    this.velY *= this.friction;

    // Actualizar posición
    this.x += this.velX;
    this.y += this.velY;

    // Límites del canvas
    this.applyBoundaries();

    // Cooldown de disparo
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // Invulnerabilidad temporal
    if (this.isInvulnerable) {
      this.invulnerabilityTimer--;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Actualizar power-ups activos
    this.updatePowerUps();
  }

  draw(ctx) {
    if (this.isDead) return;

    // Parpadeo si es invulnerable
    if (this.isInvulnerable && Math.floor(this.invulnerabilityTimer / 5) % 2 === 0) {
      return; // No dibujar (efecto parpadeo)
    }

    ctx.save();

    // Efecto de glow si tiene power-ups activos
    if (this.activePowerUps.length > 0) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.getPowerUpGlowColor();
    }

    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  applyBoundaries() {
    const margin = GAME_CONFIG.BOUNDARY_MARGIN;
    const maxX = GAME_CONFIG.CANVAS_WIDTH - this.width - margin;
    const maxY = GAME_CONFIG.CANVAS_HEIGHT - this.height - margin;

    if (this.x > maxX) {
      this.x = maxX;
      this.velX = 0;
    } else if (this.x < margin) {
      this.x = margin;
      this.velX = 0;
    }

    if (this.y > maxY) {
      this.y = maxY;
      this.velY = 0;
    } else if (this.y < margin) {
      this.y = margin;
      this.velY = 0;
    }
  }

  shoot() {
    if (this.shootCooldown > 0 || this.isDead) return null;

    this.shootCooldown = this.shootDelay;

    // Retornar array de balas según power-ups activos
    const bullets = [];
    const bulletType = this.getCurrentBulletType();

    switch(bulletType) {
      case 'DUAL_SHOT':
        bullets.push(new Bullet(this.x + this.width, this.y + 20));
        bullets.push(new Bullet(this.x + this.width, this.y + this.height - 30));
        break;

      case 'QUAD_SHOT':
        bullets.push(new Bullet(this.x + this.width, this.y + 10));
        bullets.push(new Bullet(this.x + this.width, this.y + 30));
        bullets.push(new Bullet(this.x + this.width, this.y + this.height - 40));
        bullets.push(new Bullet(this.x + this.width, this.y + this.height - 20));
        break;

      default: // Normal shot
        bullets.push(new Bullet(this.x + this.width, this.y + 20));
        bullets.push(new Bullet(this.x + this.width, this.y + this.height - 30));
        break;
    }

    return bullets;
  }

  getCurrentBulletType() {
    // Verificar power-ups activos
    if (this.hasPowerUp('QUAD_SHOT')) return 'QUAD_SHOT';
    if (this.hasPowerUp('DUAL_SHOT')) return 'DUAL_SHOT';
    return 'NORMAL';
  }

  takeDamage(amount) {
    if (this.isInvulnerable || this.isDead) return false;

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return true;
    }

    // Invulnerabilidad temporal al recibir daño
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 60; // 1 segundo a 60 FPS

    return false;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHP);
  }

  die() {
    this.isDead = true;
    this.lives--;
  }

  respawn() {
    if (this.lives <= 0) return false;

    this.hp = this.maxHP;
    this.isDead = false;
    this.x = 200;
    this.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - this.height / 2;
    this.velX = 0;
    this.velY = 0;

    // Invulnerabilidad al respawnear
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 120; // 2 segundos

    return true;
  }

  // ==========================================
  // POWER-UPS
  // ==========================================

  addPowerUp(type, duration) {
    // Verificar si ya tiene este power-up
    const existing = this.activePowerUps.find(p => p.type === type);

    if (existing) {
      // Extender duración
      existing.timer = duration;
    } else {
      // Agregar nuevo
      this.activePowerUps.push({
        type: type,
        timer: duration
      });
    }

    console.log(`Power-up activado: ${type}`);
  }

  hasPowerUp(type) {
    return this.activePowerUps.some(p => p.type === type);
  }

  updatePowerUps() {
    // Decrementar timers y eliminar expirados
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      this.activePowerUps[i].timer--;

      if (this.activePowerUps[i].timer <= 0) {
        console.log(`Power-up expirado: ${this.activePowerUps[i].type}`);
        this.activePowerUps.splice(i, 1);
      }
    }
  }

  getPowerUpGlowColor() {
    if (this.activePowerUps.length === 0) return '#ffffff';

    // Retornar color del primer power-up activo
    const type = this.activePowerUps[0].type;
    const powerUp = POWERUP_TYPES[type];
    return powerUp ? powerUp.color : '#ffffff';
  }

  // ==========================================
  // COLISIÓN
  // ==========================================

  isColliding(other) {
    return Utils.isColliding(this, other);
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getHPPercent() {
    return this.hp / this.maxHP;
  }

  isAlive() {
    return !this.isDead && this.lives > 0;
  }
}
