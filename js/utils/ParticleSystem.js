// ============================================
// PARTICLE SYSTEM - Sistema de partículas CSS
// ============================================

class Particle {
  constructor(x, y, config = {}) {
    this.x = x;
    this.y = y;
    this.vx = config.vx || (Math.random() - 0.5) * 10;
    this.vy = config.vy || (Math.random() - 0.5) * 10;
    this.life = config.life || 30;
    this.maxLife = this.life;
    this.size = config.size || Utils.randomRange(3, 8);
    this.color = config.color || '#ff6600';
    this.gravity = config.gravity || 0.2;
    this.fade = config.fade !== undefined ? config.fade : true;
    this.shrink = config.shrink || false;
    this.shape = config.shape || 'circle'; // circle, square, star
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life--;

    if (this.life <= 0) {
      this.active = false;
    }

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  draw(ctx) {
    if (!this.active) return;

    const alpha = this.fade ? (this.life / this.maxLife) : 1;
    const size = this.shrink ? (this.size * (this.life / this.maxLife)) : this.size;

    ctx.save();
    ctx.globalAlpha = alpha;

    switch(this.shape) {
      case 'circle':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
        break;

      case 'star':
        this.drawStar(ctx, this.x, this.y, size);
        break;
    }

    ctx.restore();
  }

  drawStar(ctx, x, y, size) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================
// PARTICLE EMITTER
// ============================================

class ParticleEmitter {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, config = {}) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, config));
    }
  }

  // Explosión
  explosion(x, y, config = {}) {
    const count = config.count || 20;
    const colors = config.colors || ['#ff6600', '#ff9900', '#ffcc00', '#ff0000'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = config.speed || Utils.randomRange(3, 8);

      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Utils.randomRange(20, 40),
        size: Utils.randomRange(4, 10),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0.1,
        fade: true,
        shrink: true
      }));
    }
  }

  // Explosión de jefe (más grande)
  bossExplosion(x, y, size = 'medium') {
    const counts = { small: 30, medium: 50, large: 80 };
    const count = counts[size] || 50;

    // Múltiples ondas
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.explosion(x, y, {
          count: count / 3,
          speed: 10 - wave * 2,
          colors: ['#ff0000', '#ff6600', '#ffff00', '#ffffff']
        });
      }, wave * 100);
    }
  }

  // Trail de bala
  bulletTrail(x, y, color = '#00ffff') {
    this.particles.push(new Particle(x, y, {
      vx: Utils.randomRange(-1, 1),
      vy: Utils.randomRange(-1, 1),
      life: 15,
      size: 3,
      color: color,
      gravity: 0,
      fade: true,
      shrink: true
    }));
  }

  // Impacto
  impact(x, y, color = '#ffffff') {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 10,
        size: 4,
        color: color,
        gravity: 0,
        fade: true
      }));
    }
  }

  // Spawn de power-up
  powerUpSparkle(x, y, color) {
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(x, y, {
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 20,
        size: 4,
        color: color,
        gravity: 0,
        fade: true,
        shape: 'star'
      }));
    }
  }

  // Estrellas de fondo (parallax)
  starfield(canvas, count = 100) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(
        Utils.randomRange(0, canvas.width),
        Utils.randomRange(0, canvas.height),
        {
          vx: -Utils.randomRange(0.5, 2),
          vy: 0,
          life: Infinity,
          size: Utils.randomRange(1, 3),
          color: '#ffffff',
          gravity: 0,
          fade: false
        }
      ));
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();

      if (!this.particles[i].active) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(particle => particle.draw(ctx));
  }

  clear() {
    this.particles = [];
  }

  getCount() {
    return this.particles.length;
  }
}
