// ============================================
// POWER-UP - Coleccionables del juego
// ============================================

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.type = type;

    // Obtener configuración del power-up
    this.config = POWERUP_TYPES[type];

    // Estado
    this.active = true;
    this.velY = 0;
    this.floatOffset = 0;
    this.floatSpeed = 0.1;

    // Tiempo de vida (10 segundos)
    this.lifetime = 600;
    this.blinkTimer = 0;
  }

  update() {
    // Mover ligeramente hacia abajo
    this.y += 0.5;

    // Efecto de flotación
    this.floatOffset += this.floatSpeed;

    // Tiempo de vida
    this.lifetime--;
    if (this.lifetime <= 0) {
      this.active = false;
    }

    // Parpadeo cuando está por expirar
    if (this.lifetime < 120) {
      this.blinkTimer++;
    }

    // Desactivar si sale de la pantalla
    if (this.y > GAME_CONFIG.CANVAS_HEIGHT + 50) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Parpadeo cuando está por expirar
    if (this.blinkTimer > 0 && Math.floor(this.blinkTimer / 10) % 2 === 0) {
      return;
    }

    const floatY = this.y + Math.sin(this.floatOffset) * 3;

    ctx.save();

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.config.color;

    // Dibujar power-up como círculo con color
    ctx.fillStyle = this.config.color;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, floatY + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Borde blanco
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icono (primera letra del nombre)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.config.name[0],
      this.x + this.width / 2,
      floatY + this.height / 2
    );

    ctx.restore();
  }

  isColliding(other) {
    if (!this.active) return false;
    return Utils.isColliding(this, other);
  }

  collect() {
    this.active = false;
  }

  isOffScreen() {
    return !this.active || this.y > GAME_CONFIG.CANVAS_HEIGHT + 50;
  }

  // ==========================================
  // STATIC: Spawn aleatorio de power-ups
  // ==========================================

  static spawnRandom(x, y, dropRate) {
    // Decidir si hacer drop según la tasa
    if (Math.random() > dropRate) {
      return null;
    }

    // Seleccionar tipo de power-up según probabilidades
    const roll = Math.random();
    let cumulativeProbability = 0;

    for (const [type, config] of Object.entries(POWERUP_TYPES)) {
      cumulativeProbability += config.dropRate;

      if (roll <= cumulativeProbability) {
        return new PowerUp(x, y, type);
      }
    }

    return null;
  }
}
