// ============================================
// TIE ADVANCED - Jefe 1 (Darth Vader's Ship)
// ============================================

class TIEAdvanced extends Boss {
  constructor(x, y, spriteManager) {
    const config = {
      hp: 300,
      width: 150,
      height: 150,
      speed: 3,
      shootDelay: 90,
      movePattern: 'zigzag'
    };

    super(x, y, 'TIE_ADVANCED', config);

    this.name = 'TIE Advanced x1';
    this.spriteManager = spriteManager;

    // Puntos de disparo
    this.shootPoints = [
      { offsetX: 0, offsetY: 75 }  // Centro
    ];

    // Dash attack
    this.dashTimer = 0;
    this.dashDelay = 300; // Cada 5 segundos
    this.isDashing = false;
    this.dashDuration = 30;
    this.dashSpeed = 15;

    // Crear sprite CSS
    this.createCSSSprite();
  }

  createCSSSprite() {
    // Contenedor principal
    this.cssSprite = this.spriteManager.createSprite(this.spriteId, 'div', 'tie-advanced');

    this.cssSprite.setStyles({
      width: this.width + 'px',
      height: this.height + 'px',
      position: 'absolute',
      left: this.x + 'px',
      top: this.y + 'px'
    });

    const el = this.cssSprite.element;

    // Cockpit (centro)
    const cockpit = document.createElement('div');
    cockpit.className = 'tie-cockpit';
    cockpit.style.cssText = `
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #222 0%, #000 100%);
      border: 3px solid #ff0000;
      border-radius: 8px;
      box-shadow:
        0 0 20px rgba(255, 0, 0, 0.6),
        inset 0 0 15px rgba(255, 0, 0, 0.3);
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      animation: tieGlow 2s ease-in-out infinite;
    `;
    el.appendChild(cockpit);

    // Ventana del cockpit
    const window = document.createElement('div');
    window.style.cssText = `
      width: 30px;
      height: 30px;
      background: radial-gradient(circle, #ff6666 0%, #330000 70%);
      border-radius: 50%;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    `;
    cockpit.appendChild(window);

    // Ala izquierda
    const leftWing = document.createElement('div');
    leftWing.className = 'tie-wing tie-wing-left';
    leftWing.style.cssText = `
      width: 35px;
      height: 120px;
      background: linear-gradient(90deg, #444 0%, #666 50%, #444 100%);
      border: 2px solid #333;
      border-radius: 3px;
      position: absolute;
      left: -25px;
      top: 15px;
      box-shadow: -3px 0 10px rgba(0, 0, 0, 0.5);
    `;
    el.appendChild(leftWing);

    // Ala derecha
    const rightWing = document.createElement('div');
    rightWing.className = 'tie-wing tie-wing-right';
    rightWing.style.cssText = `
      width: 35px;
      height: 120px;
      background: linear-gradient(90deg, #444 0%, #666 50%, #444 100%);
      border: 2px solid #333;
      border-radius: 3px;
      position: absolute;
      right: -25px;
      top: 15px;
      box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);
    `;
    el.appendChild(rightWing);

    // Agregar animación CSS
    this.addAnimationStyles();
  }

  addAnimationStyles() {
    // Agregar estilos de animación al documento si no existen
    if (!document.getElementById('tie-advanced-animations')) {
      const style = document.createElement('style');
      style.id = 'tie-advanced-animations';
      style.textContent = `
        @keyframes tieGlow {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(255, 0, 0, 0.6),
              inset 0 0 15px rgba(255, 0, 0, 0.3);
          }
          50% {
            box-shadow:
              0 0 30px rgba(255, 0, 0, 0.9),
              inset 0 0 20px rgba(255, 0, 0, 0.5);
          }
        }

        @keyframes tieDash {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.5);
          }
        }

        .tie-advanced.dashing {
          animation: tieDash 0.2s ease-in-out infinite;
        }

        .tie-advanced.damaged {
          animation: damage-flash 0.1s;
        }

        @keyframes damage-flash {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(2); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  update() {
    super.update();

    if (!this.active) return;

    // Dash attack logic
    this.dashTimer++;

    if (this.isDashing) {
      // Durante el dash
      this.x -= this.dashSpeed;
      this.dashDuration--;

      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.dashDuration = 30;
        this.cssSprite.removeClass('dashing');
      }
    } else {
      // Verificar si debe hacer dash
      if (this.dashTimer >= this.dashDelay) {
        this.startDash();
      }
    }
  }

  startDash() {
    console.log('TIE Advanced: Dash Attack!');
    this.isDashing = true;
    this.dashTimer = 0;
    this.cssSprite.addClass('dashing');
  }

  getShootPattern() {
    if (this.phase === 0) {
      // Fase 1: Triple shot
      return [-15, 0, 15];
    } else if (this.phase === 1) {
      // Fase 2: 5-way spread
      return [-30, -15, 0, 15, 30];
    } else {
      // Fase 3: Circular burst
      return [-45, -30, -15, 0, 15, 30, 45];
    }
  }

  onPhaseChange(newPhase) {
    super.onPhaseChange(newPhase);

    // Cambiar color del glow según la fase
    const cockpit = this.cssSprite.element.querySelector('.tie-cockpit');
    if (cockpit) {
      if (newPhase === 1) {
        cockpit.style.borderColor = '#ff6600';
      } else if (newPhase === 2) {
        cockpit.style.borderColor = '#ffff00';
        this.dashDelay = 180; // Dash más frecuente
      }
    }
  }

  onDamage() {
    super.onDamage();

    // Flash de daño
    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.addClass('damaged');
      setTimeout(() => {
        if (this.cssSprite && this.cssSprite.element) {
          this.cssSprite.removeClass('damaged');
        }
      }, 100);
    }
  }

  onDestroy() {
    super.onDestroy();

    // Animación de explosión (simple fade out)
    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.element.style.transition = 'opacity 0.5s, transform 0.5s';
      this.cssSprite.element.style.opacity = '0';
      this.cssSprite.element.style.transform = 'scale(1.5) rotate(180deg)';

      setTimeout(() => {
        if (this.spriteManager) {
          this.spriteManager.removeSprite(this.spriteId);
        }
      }, 500);
    }
  }

  // Colisión especial con dash
  isColliding(other) {
    if (!this.active) return false;

    // Durante dash, la hitbox es más grande
    if (this.isDashing) {
      return (
        this.x - 20 < other.x + other.width &&
        this.x + this.width + 20 > other.x &&
        this.y - 20 < other.y + other.height &&
        this.y + this.height + 20 > other.y
      );
    }

    return Utils.isColliding(this, other);
  }
}
