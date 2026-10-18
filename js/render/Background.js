import { CANVAS } from '../config.js';
import { rand } from '../core/utils.js';

const LAYERS = [
  { count: 70, speed: 20, size: 1, alpha: 0.4 },
  { count: 40, speed: 60, size: 1.5, alpha: 0.7 },
  { count: 15, speed: 140, size: 2, alpha: 1 },
];

/** Imagen de fondo con scroll lento + campo de estrellas en paralaje. */
export class Background {
  constructor(image) {
    this.image = image;
    this.offset = 0;
    this.speedMultiplier = 1;
    this.stars = LAYERS.flatMap((layer) =>
      Array.from({ length: layer.count }, () => ({ x: rand(0, CANVAS.WIDTH), y: rand(0, CANVAS.HEIGHT), ...layer }))
    );
  }

  update(dt) {
    this.offset += 15 * this.speedMultiplier * dt;
    for (const star of this.stars) {
      star.x -= star.speed * this.speedMultiplier * dt;
      if (star.x < 0) {
        star.x += CANVAS.WIDTH;
        star.y = rand(0, CANVAS.HEIGHT);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    if (this.image) {
      // Mosaicos alternados en espejo para que no se note la unión entre copias
      const h = CANVAS.HEIGHT;
      const w = (this.image.width / this.image.height) * h;
      const first = Math.floor(this.offset / w);
      const img = this.image;
      // Se solapa 1px y se dibuja opaco para que no aparezca una línea en la unión
      const tile = (x) => ctx.drawImage(img, x, 0, w + 1, h);
      ctx.save();
      for (let i = first; i <= first + 1; i++) {
        const x = i * w - this.offset;
        if (i % 2 === 0) {
          tile(x);
        } else {
          ctx.save();
          ctx.translate(x + w, 0);
          ctx.scale(-1, 1);
          tile(0);
          ctx.restore();
        }
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(2, 3, 10, 0.45)';
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    }

    for (const star of this.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(star.x, star.y, star.size * (1 + this.speedMultiplier * 0.5), star.size);
    }
    ctx.globalAlpha = 1;
  }
}
