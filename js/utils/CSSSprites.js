// ============================================
// CSS SPRITE RENDERER - Sistema de sprites CSS
// ============================================

class CSSSprite {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.styles = {};
  }

  create(tag = 'div', className = '') {
    this.element = document.createElement(tag);
    if (className) {
      this.element.className = className;
    }
    this.container.appendChild(this.element);
    return this;
  }

  setStyle(property, value) {
    if (this.element) {
      this.element.style[property] = value;
      this.styles[property] = value;
    }
    return this;
  }

  setStyles(styles) {
    Object.entries(styles).forEach(([prop, value]) => {
      this.setStyle(prop, value);
    });
    return this;
  }

  setPosition(x, y) {
    this.setStyle('left', `${x}px`);
    this.setStyle('top', `${y}px`);
    return this;
  }

  setSize(width, height) {
    this.setStyle('width', `${width}px`);
    this.setStyle('height', `${height}px`);
    return this;
  }

  addClass(className) {
    if (this.element) {
      this.element.classList.add(className);
    }
    return this;
  }

  removeClass(className) {
    if (this.element) {
      this.element.classList.remove(className);
    }
    return this;
  }

  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }

  hide() {
    this.setStyle('display', 'none');
    return this;
  }

  show() {
    this.setStyle('display', 'block');
    return this;
  }
}

// ============================================
// CSS SPRITE MANAGER - Gestión de sprites
// ============================================

class CSSSpriteManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = this.createContainer();
    this.sprites = new Map();
  }

  createContainer() {
    // Crear contenedor para sprites CSS que se superpone al canvas
    const container = document.createElement('div');
    container.id = 'css-sprite-container';
    container.style.position = 'absolute';
    container.style.left = this.canvas.offsetLeft + 'px';
    container.style.top = this.canvas.offsetTop + 'px';
    container.style.width = this.canvas.width + 'px';
    container.style.height = this.canvas.height + 'px';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';

    // Insertar después del canvas
    this.canvas.parentNode.insertBefore(container, this.canvas.nextSibling);

    return container;
  }

  createSprite(id, tag = 'div', className = '') {
    const sprite = new CSSSprite(this.container);
    sprite.create(tag, className);
    sprite.setStyle('position', 'absolute');
    this.sprites.set(id, sprite);
    return sprite;
  }

  getSprite(id) {
    return this.sprites.get(id);
  }

  removeSprite(id) {
    const sprite = this.sprites.get(id);
    if (sprite) {
      sprite.remove();
      this.sprites.delete(id);
    }
  }

  clear() {
    this.sprites.forEach(sprite => sprite.remove());
    this.sprites.clear();
  }

  updatePosition(id, x, y) {
    const sprite = this.sprites.get(id);
    if (sprite) {
      sprite.setPosition(x, y);
    }
  }

  destroy() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
