// ============================================
// BOSS - Clase base para todos los jefes
// ============================================

class Boss {
  constructor(x, y, type, config) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = config;

    // Stats
    this.hp = config.hp;
    this.maxHP = config.hp;
    this.width = config.width;
    this.height = config.height;
    this.speed = config.speed || 1;

    // Estado
    this.active = true;
    this.phase = 0;
    this.shootTimer = 0;
    this.shootDelay = config.shootDelay || 120;
    this.moveTimer = 0;

    // Patrón de movimiento
    this.movePattern = config.movePattern || 'static';
    this.moveData = {
      direction: 1,
      amplitude: 100,
      frequency: 0.02,
      offset: 0
    };

    // CSS Sprite (se inicializa en subclases)
    this.cssSprite = null;
    this.spriteId = `boss_${Date.now()}`;

    // Puntos de disparo (se definen en subclases)
    this.shootPoints = [];
  }

  update() {
    if (!this.active) return;

    // Actualizar movimiento
    this.updateMovement();

    // Cooldown de disparo
    if (this.shootTimer > 0) {
      this.shootTimer--;
    }

    // Actualizar timer de movimiento
    this.moveTimer++;

    // Actualizar fase según HP
    this.updatePhase();

    // Actualizar sprite CSS si existe
    if (this.cssSprite) {
      this.updateCSSSprite();
    }
  }

  updateMovement() {
    switch(this.movePattern) {
      case 'static':
        // No se mueve
        break;

      case 'vertical':
        // Movimiento vertical
        this.y += this.speed * this.moveData.direction;
        if (this.y > GAME_CONFIG.CANVAS_HEIGHT - this.height - 50 || this.y < 50) {
          this.moveData.direction *= -1;
        }
        break;

      case 'sine':
        // Movimiento en onda sinusoidal
        this.moveData.offset += this.moveData.frequency;
        this.y = (GAME_CONFIG.CANVAS_HEIGHT / 2) +
                 Math.sin(this.moveData.offset) * this.moveData.amplitude;
        break;

      case 'zigzag':
        // Movimiento en zigzag
        if (this.moveTimer % 60 === 0) {
          this.moveData.direction *= -1;
        }
        this.y += this.speed * this.moveData.direction * 2;
        this.y = Utils.clamp(this.y, 50, GAME_CONFIG.CANVAS_HEIGHT - this.height - 50);
        break;

      case 'circular':
        // Movimiento circular
        this.moveData.offset += this.moveData.frequency;
        const centerX = GAME_CONFIG.CANVAS_WIDTH - 250;
        const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
        this.x = centerX + Math.cos(this.moveData.offset) * 80;
        this.y = centerY + Math.sin(this.moveData.offset) * 80;
        break;
    }
  }

  updatePhase() {
    const hpPercent = this.hp / this.maxHP;

    if (hpPercent <= 0.3 && this.phase < 2) {
      this.phase = 2;
      this.onPhaseChange(2);
    } else if (hpPercent <= 0.6 && this.phase < 1) {
      this.phase = 1;
      this.onPhaseChange(1);
    }
  }

  onPhaseChange(newPhase) {
    console.log(`Boss cambió a fase ${newPhase}`);
    // Override en subclases
  }

  shoot() {
    if (this.shootTimer > 0 || !this.active) return null;

    this.shootTimer = this.shootDelay;

    // Disparar desde todos los puntos de disparo
    const bullets = [];
    this.shootPoints.forEach(point => {
      const bulletX = this.x + point.offsetX;
      const bulletY = this.y + point.offsetY;

      // Crear patrón de disparo según el tipo
      const pattern = this.getShootPattern();
      pattern.forEach(angle => {
        const bullet = new EnemyBullet(bulletX, bulletY);

        // Aplicar ángulo si no es 0
        if (angle !== 0) {
          const rad = Utils.degToRad(angle);
          bullet.vx = Math.cos(rad + Math.PI) * bullet.speed;
          bullet.vy = Math.sin(rad + Math.PI) * bullet.speed;
          bullet.angle = angle;
        }

        bullets.push(bullet);
      });
    });

    return bullets.length > 0 ? bullets : null;
  }

  getShootPattern() {
    // Pattern básico - Override en subclases
    return [0]; // Disparo recto
  }

  takeDamage(amount) {
    if (!this.active) return false;

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.destroy();
      return true; // Murió
    }

    // Efecto visual de daño
    this.onDamage();

    return false;
  }

  onDamage() {
    // Override en subclases para efectos visuales
  }

  destroy() {
    this.active = false;
    this.onDestroy();
  }

  onDestroy() {
    // Limpiar sprite CSS
    if (this.cssSprite) {
      this.cssSprite.remove();
      this.cssSprite = null;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Los jefes CSS no dibujan en canvas
    // Se renderizan con CSS sprites

    // Debug hitbox (opcional)
    if (GAME_CONFIG.DEBUG_MODE) {
      ctx.save();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }
  }

  updateCSSSprite() {
    // Actualizar posición del sprite CSS
    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.setPosition(this.x, this.y);
    }
  }

  isColliding(other) {
    if (!this.active) return false;
    return Utils.isColliding(this, other);
  }

  isOffScreen() {
    return !this.active;
  }

  getHPPercent() {
    return this.hp / this.maxHP;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getDamageColor() {
    const hpPercent = this.getHPPercent();
    if (hpPercent > 0.6) return '#00ff00';
    if (hpPercent > 0.3) return '#ffff00';
    return '#ff0000';
  }
}
