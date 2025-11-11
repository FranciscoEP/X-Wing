// ============================================
// UTILIDADES Y FUNCIONES HELPER
// ============================================

const Utils = {
  /**
   * Genera un número aleatorio entre min y max
   */
  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Genera un número flotante aleatorio entre min y max
   */
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Detecta colisión entre dos rectángulos (AABB)
   */
  isColliding(obj1, obj2) {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  },

  /**
   * Calcula la distancia entre dos puntos
   */
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Calcula el ángulo entre dos puntos (en radianes)
   */
  angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * Convierte grados a radianes
   */
  degToRad(degrees) {
    return degrees * (Math.PI / 180);
  },

  /**
   * Convierte radianes a grados
   */
  radToDeg(radians) {
    return radians * (180 / Math.PI);
  },

  /**
   * Limita un valor entre min y max
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Interpola linealmente entre dos valores
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  },

  /**
   * Verifica si un objeto está fuera de los límites del canvas
   */
  isOutOfBounds(obj, canvas, margin = 50) {
    return (
      obj.x < -margin ||
      obj.x > canvas.width + margin ||
      obj.y < -margin ||
      obj.y > canvas.height + margin
    );
  },

  /**
   * Genera una posición aleatoria en el canvas
   */
  randomPosition(canvas, margin = 50) {
    return {
      x: this.randomRange(margin, canvas.width - margin),
      y: this.randomRange(margin, canvas.height - margin)
    };
  },

  /**
   * Formatea un número con separadores de miles
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * Genera un color hexadecimal aleatorio
   */
  randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  },

  /**
   * Reproduce un sonido con control de volumen
   */
  playSound(audioElement, volume = 1.0) {
    if (audioElement) {
      audioElement.volume = volume;
      audioElement.currentTime = 0;
      audioElement.play().catch(e => console.log('Error al reproducir audio:', e));
    }
  },

  /**
   * Para un sonido
   */
  stopSound(audioElement) {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
  },

  /**
   * Hace fade in de un audio
   */
  fadeInAudio(audioElement, duration = 1000, targetVolume = 1.0) {
    if (!audioElement) return;

    audioElement.volume = 0;
    audioElement.play();

    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audioElement.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
      }
    }, stepTime);
  },

  /**
   * Hace fade out de un audio
   */
  fadeOutAudio(audioElement, duration = 1000) {
    if (!audioElement) return;

    const steps = 20;
    const stepTime = duration / steps;
    const startVolume = audioElement.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audioElement.volume = Math.max(startVolume - (volumeStep * currentStep), 0);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }, stepTime);
  },

  /**
   * Agita la pantalla (screen shake effect)
   */
  screenShake(canvas, intensity = 10, duration = 200) {
    const originalTransform = canvas.style.transform;
    const startTime = Date.now();

    const shake = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        const x = (Math.random() - 0.5) * intensity;
        const y = (Math.random() - 0.5) * intensity;
        canvas.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(shake);
      } else {
        canvas.style.transform = originalTransform;
      }
    };

    shake();
  },

  /**
   * Flash de pantalla
   */
  screenFlash(ctx, canvas, color = 'rgba(255, 255, 255, 0.5)', duration = 100) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setTimeout(() => {
      // El flash se limpia en el próximo frame
    }, duration);
  },

  /**
   * Dibuja texto con sombra
   */
  drawTextWithShadow(ctx, text, x, y, color = '#fff', shadowColor = '#000') {
    ctx.save();

    // Sombra
    ctx.fillStyle = shadowColor;
    ctx.fillText(text, x + 2, y + 2);

    // Texto
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.restore();
  },

  /**
   * Dibuja un rectángulo con borde redondeado
   */
  drawRoundedRect(ctx, x, y, width, height, radius, fillColor, strokeColor) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }

    ctx.restore();
  }
};
