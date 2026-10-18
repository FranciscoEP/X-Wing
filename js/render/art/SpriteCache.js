import { BOSS_TYPES, ENEMY_TYPES, PLAYER } from '../../config.js';

/**
 * Variantes de cada nave a partir de los PNG del juego. `glow` se hornea en el sprite con
 * shadowBlur una sola vez (no en cada frame); `shade` oscurece la nave (la de Vader).
 */
export const SPRITE_STYLES = {
  player: { image: 'player', width: PLAYER.WIDTH, height: PLAYER.HEIGHT },
  TIE_FIGHTER: { image: 'tie', size: ENEMY_TYPES.TIE_FIGHTER.size },
  TIE_INTERCEPTOR: { image: 'tie', size: ENEMY_TYPES.TIE_INTERCEPTOR.size, glow: { color: '#ff4d4d', blur: 10 } },
  TIE_ADVANCED: {
    image: 'tie',
    width: BOSS_TYPES.TIE_ADVANCED.width,
    height: BOSS_TYPES.TIE_ADVANCED.height,
    shade: 0.35,
    glow: { color: '#ff2e2e', blur: 18 },
  },
};

const PADDING = 4; // px lógicos alrededor del sprite (más el halo si lo tiene)

/**
 * Prerenderiza cada nave una sola vez, a la escala de la pantalla, con reescalado de alta
 * calidad. Dibujar el sprite cacheado es mucho más barato que reescalar el PNG original en cada
 * frame. Cada enemigo tiene además su versión `flash` (silueta blanca) para los impactos,
 * en lugar de `ctx.filter`, que no funciona en Safari.
 */
export class SpriteCache {
  constructor(images, scale = 1, createCanvas = defaultCreateCanvas) {
    this.images = images;
    this.scale = scale;
    this.createCanvas = createCanvas;
    this.player = this.build(SPRITE_STYLES.player);
    this.enemies = {
      TIE_FIGHTER: this.withFlash(this.build(SPRITE_STYLES.TIE_FIGHTER)),
      TIE_INTERCEPTOR: this.withFlash(this.build(SPRITE_STYLES.TIE_INTERCEPTOR)),
    };
    this.vader = this.withFlash(this.build(SPRITE_STYLES.TIE_ADVANCED));
  }

  /** Sprite de `style.width`×`style.height` lógicos (o `size`×`size·0.8` para los TIE). Null si falta la imagen. */
  build(style) {
    const image = this.images[style.image];
    const width = style.width ?? style.size;
    const height = style.height ?? style.size * 0.8;
    if (!image) return { canvas: null, width, height, padding: 0 };

    const padding = PADDING + (style.glow?.blur ?? 0);
    const s = this.scale;
    const canvas = this.createCanvas(Math.ceil((width + padding * 2) * s), Math.ceil((height + padding * 2) * s));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const x = padding * s;
    const y = padding * s;

    if (style.glow) {
      ctx.shadowColor = style.glow.color;
      ctx.shadowBlur = style.glow.blur * s;
    }
    ctx.drawImage(image, x, y, width * s, height * s);
    if (style.glow) ctx.shadowBlur = 0;

    if (style.shade) {
      // Oscurece solo la nave (source-atop respeta la transparencia del PNG)
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0, 0, 0, ${style.shade})`;
      ctx.fillRect(x, y, width * s, height * s);
      ctx.globalCompositeOperation = 'source-over';
    }
    return { canvas, width, height, padding };
  }

  /** Añade una silueta blanca del sprite (para el destello al recibir daño). */
  withFlash(sprite) {
    if (!sprite.canvas) return sprite;
    const flash = this.createCanvas(sprite.canvas.width, sprite.canvas.height);
    const ctx = flash.getContext('2d');
    ctx.drawImage(sprite.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flash.width, flash.height);
    return { ...sprite, flash };
  }
}

/** Dibuja un sprite centrado en (cx, cy) con su tamaño lógico; si falta la imagen, un rectángulo. */
export function drawSprite(ctx, sprite, cx, cy, { flash = false } = {}) {
  if (!sprite.canvas) {
    ctx.fillStyle = flash ? '#fff' : '#888';
    ctx.fillRect(cx - sprite.width / 2, cy - sprite.height / 2, sprite.width, sprite.height);
    return;
  }
  const w = sprite.width + sprite.padding * 2;
  const h = sprite.height + sprite.padding * 2;
  ctx.drawImage(flash && sprite.flash ? sprite.flash : sprite.canvas, cx - w / 2, cy - h / 2, w, h);
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Imagen PNG (data URL) de un sprite para usarla en el HTML (vidas del HUD), o null. */
export function spriteToDataUrl(sprite) {
  return sprite.canvas ? sprite.canvas.toDataURL('image/png') : null;
}
