import { CANVAS } from '../config.js';

export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.dead = false;
  }

  get cx() {
    return this.x + this.width / 2;
  }

  get cy() {
    return this.y + this.height / 2;
  }

  isOffScreen(margin = 80) {
    return (
      this.x + this.width < -margin ||
      this.x > CANVAS.WIDTH + margin ||
      this.y + this.height < -margin ||
      this.y > CANVAS.HEIGHT + margin
    );
  }
}
