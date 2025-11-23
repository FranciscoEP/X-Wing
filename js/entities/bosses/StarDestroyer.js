// ============================================
// STAR DESTROYER - Jefe 2 (Imperial Capital Ship)
// ============================================

class StarDestroyer extends Boss {
  constructor(x, y, spriteManager) {
    const config = {
      hp: 500,
      width: 300,
      height: 200,
      speed: 0.5,
      shootDelay: 60,
      movePattern: 'vertical'
    };

    super(x, y, 'STAR_DESTROYER', config);

    this.name = 'Imperial Star Destroyer';
    this.spriteManager = spriteManager;

    // Múltiples puntos de disparo (turbolásers)
    this.shootPoints = [
      { offsetX: 50, offsetY: 40 },   // Turret 1
      { offsetX: 50, offsetY: 80 },   // Turret 2
      { offsetX: 50, offsetY: 120 },  // Turret 3
      { offsetX: 50, offsetY: 160 },  // Turret 4
      { offsetX: 150, offsetY: 60 },  // Turret 5
      { offsetX: 150, offsetY: 140 }  // Turret 6
    ];

    // TIE Fighter spawning
    this.spawnTimer = 0;
    this.spawnDelay = 180; // Cada 3 segundos
    this.canSpawnTIEs = false;

    // Crear sprite CSS
    this.createCSSSprite();
  }

  createCSSSprite() {
    this.cssSprite = this.spriteManager.createSprite(this.spriteId, 'div', 'star-destroyer');

    this.cssSprite.setStyles({
      width: this.width + 'px',
      height: this.height + 'px',
      position: 'absolute',
      left: this.x + 'px',
      top: this.y + 'px'
    });

    const el = this.cssSprite.element;

    // Cuerpo principal (forma de daga)
    const body = document.createElement('div');
    body.className = 'destroyer-body';
    body.style.cssText = `
      width: 0;
      height: 0;
      border-left: 150px solid transparent;
      border-right: 150px solid transparent;
      border-bottom: 200px solid #555;
      position: absolute;
      left: 0;
      top: 0;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
    `;
    el.appendChild(body);

    // Torre de comando
    const tower = document.createElement('div');
    tower.className = 'command-tower';
    tower.style.cssText = `
      width: 40px;
      height: 80px;
      background: linear-gradient(90deg, #444 0%, #666 50%, #444 100%);
      border: 2px solid #333;
      border-radius: 3px;
      position: absolute;
      left: 130px;
      top: 160px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
    `;
    el.appendChild(tower);

    // Ventanas de la torre
    for (let i = 0; i < 4; i++) {
      const window = document.createElement('div');
      window.style.cssText = `
        width: 8px;
        height: 6px;
        background: #ffcc00;
        position: absolute;
        left: ${8 + (i * 6)}px;
        top: ${20 + (i * 12)}px;
        box-shadow: 0 0 3px #ffcc00;
      `;
      tower.appendChild(window);
    }

    // Motores (glow azul)
    const engines = document.createElement('div');
    engines.className = 'engines';
    engines.style.cssText = `
      width: 100px;
      height: 20px;
      background: radial-gradient(ellipse, #4da6ff 0%, #0066cc 50%, transparent 80%);
      position: absolute;
      left: 100px;
      bottom: 5px;
      animation: enginePulse 1s ease-in-out infinite;
      box-shadow: 0 0 20px #4da6ff;
    `;
    el.appendChild(engines);

    // Ventanas del casco (grid pattern)
    this.addWindows(body);

    // Turrets (puntos de disparo visuales)
    this.addTurrets(el);

    // Agregar animaciones
    this.addAnimationStyles();
  }

  addWindows(body) {
    // Agregar ventanas pequeñas al casco
    const windowsContainer = document.createElement('div');
    windowsContainer.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
    `;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        const window = document.createElement('div');
        window.style.cssText = `
          width: 3px;
          height: 3px;
          background: rgba(255, 204, 0, 0.6);
          position: absolute;
          left: ${60 + col * 20}px;
          top: ${30 + row * 25}px;
          box-shadow: 0 0 2px rgba(255, 204, 0, 0.8);
        `;
        windowsContainer.appendChild(window);
      }
    }

    body.appendChild(windowsContainer);
  }

  addTurrets(el) {
    // Agregar torretas visuales
    this.shootPoints.forEach((point, index) => {
      const turret = document.createElement('div');
      turret.className = `turret turret-${index}`;
      turret.style.cssText = `
        width: 12px;
        height: 12px;
        background: #888;
        border: 2px solid #444;
        border-radius: 50%;
        position: absolute;
        left: ${point.offsetX}px;
        top: ${point.offsetY}px;
        box-shadow: 0 0 5px rgba(255, 100, 0, 0.5);
      `;
      el.appendChild(turret);
    });
  }

  addAnimationStyles() {
    if (!document.getElementById('star-destroyer-animations')) {
      const style = document.createElement('style');
      style.id = 'star-destroyer-animations';
      style.textContent = `
        @keyframes enginePulse {
          0%, 100% {
            opacity: 0.8;
            box-shadow: 0 0 20px #4da6ff;
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 30px #4da6ff;
          }
        }

        @keyframes turretFire {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        .star-destroyer.damaged {
          animation: damage-shake 0.2s;
        }

        @keyframes damage-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .star-destroyer.phase-2 .destroyer-body {
          border-bottom-color: #ff6600;
        }

        .star-destroyer.phase-3 .destroyer-body {
          border-bottom-color: #ff0000;
        }
      `;
      document.head.appendChild(style);
    }
  }

  update() {
    super.update();

    if (!this.active) return;

    // TIE Fighter spawning logic
    if (this.canSpawnTIEs) {
      this.spawnTimer++;
    }
  }

  shoot() {
    if (this.shootTimer > 0 || !this.active) return null;

    this.shootTimer = this.shootDelay;

    const bullets = [];

    // En fase 1, solo algunos turrets disparan
    const activePoints = this.phase === 0 ?
      [this.shootPoints[0], this.shootPoints[2], this.shootPoints[4]] :
      this.shootPoints;

    activePoints.forEach((point, index) => {
      const bulletX = this.x + point.offsetX;
      const bulletY = this.y + point.offsetY;

      const bullet = new EnemyBullet(bulletX, bulletY);
      bullets.push(bullet);

      // Animación de disparo en la torreta
      this.animateTurretFire(index);
    });

    return bullets.length > 0 ? bullets : null;
  }

  animateTurretFire(turretIndex) {
    const turret = this.cssSprite.element.querySelector(`.turret-${turretIndex}`);
    if (turret) {
      turret.style.animation = 'turretFire 0.2s';
      turret.style.boxShadow = '0 0 10px rgba(255, 100, 0, 1)';

      setTimeout(() => {
        if (turret) {
          turret.style.animation = '';
          turret.style.boxShadow = '0 0 5px rgba(255, 100, 0, 0.5)';
        }
      }, 200);
    }
  }

  shouldSpawnTIE() {
    if (!this.canSpawnTIEs || !this.active) return false;

    if (this.spawnTimer >= this.spawnDelay) {
      this.spawnTimer = 0;
      return true;
    }

    return false;
  }

  getShootPattern() {
    return [0]; // Disparo directo desde cada turret
  }

  onPhaseChange(newPhase) {
    super.onPhaseChange(newPhase);

    console.log(`Star Destroyer: Fase ${newPhase + 1}`);

    if (newPhase === 1) {
      // Fase 2: Activar spawn de TIEs
      this.canSpawnTIEs = true;
      this.shootDelay = 45; // Disparo más rápido
      this.cssSprite.addClass('phase-2');
    } else if (newPhase === 2) {
      // Fase 3: RAGE MODE
      this.shootDelay = 30; // Disparo muy rápido
      this.spawnDelay = 120; // Spawn más frecuente
      this.cssSprite.addClass('phase-3');
    }
  }

  onDamage() {
    super.onDamage();

    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.addClass('damaged');
      setTimeout(() => {
        if (this.cssSprite && this.cssSprite.element) {
          this.cssSprite.removeClass('damaged');
        }
      }, 200);
    }
  }

  onDestroy() {
    super.onDestroy();

    // Explosión épica
    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.element.style.transition = 'all 1s';
      this.cssSprite.element.style.opacity = '0';
      this.cssSprite.element.style.transform = 'scale(1.3) rotate(-15deg)';
      this.cssSprite.element.style.filter = 'brightness(3)';

      setTimeout(() => {
        if (this.spriteManager) {
          this.spriteManager.removeSprite(this.spriteId);
        }
      }, 1000);
    }
  }
}
