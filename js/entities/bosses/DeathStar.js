// ============================================
// DEATH STAR - Jefe Final (Ultimate Boss)
// ============================================

class DeathStar extends Boss {
  constructor(x, y, spriteManager) {
    const config = {
      hp: 1000,
      width: 400,
      height: 400,
      speed: 0,
      shootDelay: 40,
      movePattern: 'static'
    };

    super(x, y, 'DEATH_STAR', config);

    this.name = 'Death Star';
    this.spriteManager = spriteManager;

    // Weak point (exhaust port)
    this.weakPoint = {
      x: 80,
      y: 200,
      width: 30,
      height: 30,
      damageMultiplier: 10
    };

    // Torretas (8 puntos de disparo)
    this.shootPoints = [];
    for (let i = 0; i < 8; i++) {
      const angle = (360 / 8) * i;
      const rad = Utils.degToRad(angle);
      const distance = 150;
      this.shootPoints.push({
        offsetX: 200 + Math.cos(rad) * distance,
        offsetY: 200 + Math.sin(rad) * distance
      });
    }

    // Superlaser
    this.superlaserTimer = 0;
    this.superlaserDelay = 900; // 15 segundos
    this.isFiringSuperLaser = false;
    this.superlaserChargeTime = 120; // 2 segundos de carga
    this.superlaserCharge = 0;
    this.superlaserActive = false;

    // Rotation
    this.rotation = 0;

    // Crear sprite CSS
    this.createCSSSprite();
  }

  createCSSSprite() {
    this.cssSprite = this.spriteManager.createSprite(this.spriteId, 'div', 'death-star');

    this.cssSprite.setStyles({
      width: this.width + 'px',
      height: this.height + 'px',
      position: 'absolute',
      left: this.x + 'px',
      top: this.y + 'px'
    });

    const el = this.cssSprite.element;

    // Esfera principal
    const sphere = document.createElement('div');
    sphere.className = 'death-star-sphere';
    sphere.style.cssText = `
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 30% 30%, #888 0%, #555 50%, #333 100%);
      border-radius: 50%;
      position: relative;
      box-shadow:
        0 0 50px rgba(0, 255, 0, 0.2),
        inset -30px -30px 80px rgba(0, 0, 0, 0.5),
        inset 10px 10px 40px rgba(255, 255, 255, 0.1);
      animation: deathStarRotate 60s linear infinite;
    `;
    el.appendChild(sphere);

    // Trinchera ecuatorial
    const trench = document.createElement('div');
    trench.className = 'equatorial-trench';
    trench.style.cssText = `
      width: 100%;
      height: 20px;
      background: linear-gradient(180deg, #222 0%, #111 50%, #222 100%);
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
    `;
    sphere.appendChild(trench);

    // Paneles (grid pattern)
    this.addPanels(sphere);

    // Superlaser dish
    const superLaser = document.createElement('div');
    superLaser.className = 'superlaser-dish';
    superLaser.style.cssText = `
      width: 150px;
      height: 75px;
      background: radial-gradient(ellipse, #0f0 0%, #0a0 40%, #050 70%, transparent 100%);
      border-radius: 50% 50% 0 0;
      position: absolute;
      top: 50px;
      left: 125px;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
      opacity: 0.3;
    `;
    sphere.appendChild(superLaser);

    // Exhaust port (weak point)
    const exhaustPort = document.createElement('div');
    exhaustPort.className = 'exhaust-port';
    exhaustPort.style.cssText = `
      width: ${this.weakPoint.width}px;
      height: ${this.weakPoint.height}px;
      background: radial-gradient(circle, #f00 0%, #800 50%, #400 100%);
      border: 2px solid #600;
      border-radius: 3px;
      position: absolute;
      left: ${this.weakPoint.x}px;
      top: ${this.weakPoint.y}px;
      box-shadow:
        0 0 15px #f00,
        inset 0 0 8px #ff0000;
      animation: exhaustPulse 1s ease-in-out infinite;
    `;
    sphere.appendChild(exhaustPort);

    // Torretas
    this.addTurrets(sphere);

    // Agregar animaciones
    this.addAnimationStyles();
  }

  addPanels(sphere) {
    // Grid de paneles
    const panels = document.createElement('div');
    panels.className = 'panels';
    panels.style.cssText = `
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      border-radius: 50%;
      overflow: hidden;
    `;

    // Crear grid pattern
    for (let i = 0; i < 20; i++) {
      const line = document.createElement('div');
      line.style.cssText = `
        width: 2px;
        height: 100%;
        background: rgba(0, 0, 0, 0.2);
        position: absolute;
        left: ${i * 5}%;
        top: 0;
      `;
      panels.appendChild(line);
    }

    for (let i = 0; i < 20; i++) {
      const line = document.createElement('div');
      line.style.cssText = `
        width: 100%;
        height: 2px;
        background: rgba(0, 0, 0, 0.2);
        position: absolute;
        left: 0;
        top: ${i * 5}%;
      `;
      panels.appendChild(line);
    }

    sphere.appendChild(panels);
  }

  addTurrets(sphere) {
    this.shootPoints.forEach((point, index) => {
      const turret = document.createElement('div');
      turret.className = `ds-turret turret-${index}`;
      turret.style.cssText = `
        width: 10px;
        height: 10px;
        background: #666;
        border: 1px solid #444;
        border-radius: 50%;
        position: absolute;
        left: ${point.offsetX - 5}px;
        top: ${point.offsetY - 5}px;
        box-shadow: 0 0 5px rgba(255, 100, 0, 0.5);
      `;
      sphere.appendChild(turret);
    });
  }

  addAnimationStyles() {
    if (!document.getElementById('death-star-animations')) {
      const style = document.createElement('style');
      style.id = 'death-star-animations';
      style.textContent = `
        @keyframes deathStarRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes exhaustPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 15px #f00, inset 0 0 8px #ff0000;
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
            box-shadow: 0 0 25px #f00, inset 0 0 12px #ff0000;
          }
        }

        @keyframes superlaserCharge {
          0% {
            opacity: 0.3;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
            filter: brightness(0.5);
          }
          100% {
            opacity: 1;
            box-shadow: 0 0 80px rgba(0, 255, 0, 0.9);
            filter: brightness(2);
          }
        }

        .death-star.charging .superlaser-dish {
          animation: superlaserCharge 2s ease-in;
        }

        .death-star.firing .superlaser-dish {
          opacity: 1;
          box-shadow: 0 0 100px rgba(0, 255, 0, 1);
          filter: brightness(3);
        }

        @keyframes deathStarDamage {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(2); }
        }

        .death-star.damaged {
          animation: deathStarDamage 0.15s;
        }

        .death-star.phase-2 .death-star-sphere {
          box-shadow:
            0 0 60px rgba(255, 100, 0, 0.4),
            inset -30px -30px 80px rgba(0, 0, 0, 0.5);
        }

        .death-star.phase-3 .death-star-sphere {
          box-shadow:
            0 0 80px rgba(255, 0, 0, 0.6),
            inset -30px -30px 80px rgba(0, 0, 0, 0.5);
          animation: deathStarRage 0.5s ease-in-out infinite;
        }

        @keyframes deathStarRage {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(2px) translateY(-2px); }
          75% { transform: translateX(-2px) translateY(2px); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  update() {
    super.update();

    if (!this.active) return;

    // Superlaser logic
    if (this.superlaserActive) {
      this.updateSuperLaser();
    }

    this.rotation += 0.01;
  }

  updateSuperLaser() {
    this.superlaserTimer++;

    if (this.isFiringSuperLaser) {
      // En proceso de cargar
      this.superlaserCharge++;

      if (this.superlaserCharge >= this.superlaserChargeTime) {
        // Disparar!
        this.fireSuperLaser();
      }
    } else {
      // Cooldown
      if (this.superlaserTimer >= this.superlaserDelay) {
        this.startSuperLaserCharge();
      }
    }
  }

  startSuperLaserCharge() {
    console.log('Death Star: Charging Superlaser!');
    this.isFiringSuperLaser = true;
    this.superlaserCharge = 0;
    this.superlaserTimer = 0;

    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.addClass('charging');
    }
  }

  fireSuperLaser() {
    console.log('Death Star: SUPERLASER FIRED!');
    this.isFiringSuperLaser = false;
    this.superlaserCharge = 0;

    if (this.cssSprite && this.cssSprite.element) {
      this.cssSprite.removeClass('charging');
      this.cssSprite.addClass('firing');

      setTimeout(() => {
        if (this.cssSprite && this.cssSprite.element) {
          this.cssSprite.removeClass('firing');
        }
      }, 1000);
    }

    // El GameManager detectará esto y creará el efecto
    return true;
  }

  isSuperLaserFiring() {
    return this.cssSprite &&
           this.cssSprite.element &&
           this.cssSprite.element.classList.contains('firing');
  }

  takeDamage(amount, isWeakPoint = false) {
    if (!this.active) return false;

    // Si golpea el weak point, daño x10
    if (isWeakPoint) {
      amount *= this.weakPoint.damageMultiplier;
      console.log(`Weak point hit! Damage: ${amount}`);

      // Flash en el exhaust port
      const exhaustPort = this.cssSprite.element.querySelector('.exhaust-port');
      if (exhaustPort) {
        exhaustPort.style.animation = 'none';
        exhaustPort.style.background = '#fff';
        setTimeout(() => {
          exhaustPort.style.animation = 'exhaustPulse 1s ease-in-out infinite';
          exhaustPort.style.background = 'radial-gradient(circle, #f00 0%, #800 50%, #400 100%)';
        }, 100);
      }
    }

    return super.takeDamage(amount);
  }

  // Verificar si una bala golpeó el weak point
  checkWeakPointHit(bullet) {
    if (!this.active) return false;

    const wpX = this.x + this.weakPoint.x;
    const wpY = this.y + this.weakPoint.y;

    return (
      bullet.x < wpX + this.weakPoint.width &&
      bullet.x + bullet.width > wpX &&
      bullet.y < wpY + this.weakPoint.height &&
      bullet.y + bullet.height > wpY
    );
  }

  getShootPattern() {
    // Cada torreta dispara independientemente
    return [0];
  }

  shoot() {
    if (this.shootTimer > 0 || !this.active) return null;

    this.shootTimer = this.shootDelay;

    const bullets = [];

    // Solo algunas torretas disparan según la fase
    const activeCount = this.phase === 0 ? 4 : (this.phase === 1 ? 6 : 8);

    for (let i = 0; i < activeCount; i++) {
      const point = this.shootPoints[i];
      const bulletX = this.x + point.offsetX;
      const bulletY = this.y + point.offsetY;

      const bullet = new EnemyBullet(bulletX, bulletY);
      bullets.push(bullet);

      // Animación de disparo
      this.animateTurretFire(i);
    }

    return bullets.length > 0 ? bullets : null;
  }

  animateTurretFire(turretIndex) {
    const turret = this.cssSprite.element.querySelector(`.turret-${turretIndex}`);
    if (turret) {
      turret.style.background = '#ff6600';
      turret.style.boxShadow = '0 0 15px rgba(255, 100, 0, 1)';

      setTimeout(() => {
        if (turret) {
          turret.style.background = '#666';
          turret.style.boxShadow = '0 0 5px rgba(255, 100, 0, 0.5)';
        }
      }, 150);
    }
  }

  onPhaseChange(newPhase) {
    super.onPhaseChange(newPhase);

    console.log(`Death Star: Fase ${newPhase + 1} - CRITICAL`);

    if (newPhase === 1) {
      // Fase 2: Activar superlaser
      this.superlaserActive = true;
      this.shootDelay = 35;
      this.cssSprite.addClass('phase-2');
    } else if (newPhase === 2) {
      // Fase 3: RAGE MODE
      this.superlaserDelay = 480; // Cada 8 segundos
      this.shootDelay = 25;
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
      }, 150);
    }
  }

  onDestroy() {
    super.onDestroy();

    // Explosión épica de la Death Star
    if (this.cssSprite && this.cssSprite.element) {
      const el = this.cssSprite.element;

      el.style.transition = 'all 2s ease-out';
      el.style.transform = 'scale(2)';
      el.style.opacity = '0';
      el.style.filter = 'brightness(5) blur(10px)';

      // Múltiples flashes
      let flashCount = 0;
      const flashInterval = setInterval(() => {
        if (el && flashCount < 10) {
          el.style.filter = flashCount % 2 === 0 ?
            'brightness(10) blur(5px)' :
            'brightness(2) blur(15px)';
          flashCount++;
        } else {
          clearInterval(flashInterval);
        }
      }, 200);

      setTimeout(() => {
        if (this.spriteManager) {
          this.spriteManager.removeSprite(this.spriteId);
        }
      }, 2000);
    }
  }
}
