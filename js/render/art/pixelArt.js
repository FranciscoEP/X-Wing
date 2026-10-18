import { PAL } from './palette.js';

/**
 * Naves en pixel art, dibujadas por código píxel a píxel. Cada sprite define su tamaño en
 * píxeles del búfer (480×270) y una función `paint(p)` con primitivas enteras:
 *   p.r(x, y, w, h, color)   rectángulo
 *   p.c(cx, cy, r, color)    círculo relleno
 *   p.mirrorY / p.mirrorX    repiten una forma reflejada
 * El contorno oscuro de 1 px se añade automáticamente (SpriteCache), como en el pixel art clásico.
 */

/** X-Wing visto desde arriba, mirando a la derecha. Cañones a ±9 px (= PLAYER.CANNON_OFFSET). */
export const XWING = {
  w: 36,
  h: 21,
  paint(p) {
    const cy = 10;
    // Alas, toberas y cañones: se dibuja el lado de arriba y se refleja abajo
    p.mirrorY(cy, () => {
      for (let k = 0; k < 6; k++) p.r(5, 7 - k, 10 - k, 1, k === 5 ? PAL.mid : PAL.light);
      p.r(7, 4, 3, 2, PAL.red);
      p.r(4, 1, 28, 1, PAL.mid);
      p.r(4, 1, 6, 1, PAL.light);
      p.r(32, 1, 2, 1, PAL.red);
      p.r(1, 6, 5, 2, PAL.dark);
      p.r(0, 6, 1, 2, PAL.orange);
    });
    // Fuselaje
    p.r(4, 8, 24, 5, PAL.white);
    p.r(4, 12, 24, 1, PAL.light);
    p.r(28, 9, 5, 3, PAL.white);
    p.r(33, 10, 3, 1, PAL.light);
    p.r(26, 8, 2, 5, PAL.red);
    // Cabina y R2-D2
    p.r(15, 9, 7, 3, PAL.ink);
    p.r(16, 9, 4, 1, PAL.glass);
    p.r(10, 9, 3, 3, PAL.blue);
    p.r(11, 9, 1, 1, PAL.white);
  },
};

/** Toberas del X-Wing en píxeles relativos al centro del sprite (para el fuego animado). */
export const XWING_ENGINES = [
  [-18, -3],
  [-18, 3],
];

function tieCockpit(p, cx, cy, r, glow) {
  p.c(cx, cy, r, PAL.imperial);
  p.r(cx - r + 1, cy + 1, r * 2 - 1, Math.max(1, r - 2), PAL.imperialDk);
  p.c(cx, cy, r - 2, PAL.ink);
  p.r(cx - 1, cy, 3, 1, glow);
  p.r(cx, cy - 1, 1, 3, glow);
}

/** TIE Fighter de frente: «|o|». */
export const TIE_FIGHTER = {
  w: 26,
  h: 22,
  paint(p) {
    p.mirrorX(13, () => {
      p.r(0, 2, 4, 18, PAL.panel);
      p.r(1, 0, 2, 2, PAL.panel);
      p.r(1, 20, 2, 2, PAL.panel);
      p.r(0, 2, 1, 18, PAL.imperialDk);
      for (const y of [6, 11, 15]) p.r(0, y, 4, 1, PAL.imperialDk);
      p.r(4, 10, 5, 3, PAL.imperialDk);
      p.r(4, 10, 5, 1, PAL.imperial);
    });
    tieCockpit(p, 13, 11, 5, PAL.window);
  },
};

/** TIE Interceptor: alas en daga con puntas rojas. */
export const TIE_INTERCEPTOR = {
  w: 26,
  h: 20,
  paint(p) {
    p.mirrorX(13, () => {
      p.line(5, 8, 0, 0, PAL.panel, 2);
      p.line(5, 11, 0, 19, PAL.panel, 2);
      p.r(4, 7, 2, 6, PAL.imperialDk);
      p.r(0, 0, 2, 2, PAL.red);
      p.r(0, 18, 2, 2, PAL.red);
      p.r(6, 9, 4, 2, PAL.imperialDk);
    });
    tieCockpit(p, 13, 10, 4, PAL.window);
  },
};

/** TIE Advanced de Vader: alas dobladas «)o(» y casco trasero alargado (mira a la izquierda). */
export const TIE_ADVANCED = {
  w: 40,
  h: 34,
  paint(p) {
    const cx = 17;
    const cy = 17;
    // Casco trasero
    p.r(18, 13, 16, 9, PAL.imperialDk);
    p.r(18, 13, 16, 1, PAL.imperial);
    p.r(34, 15, 4, 5, PAL.panel);
    // Alas dobladas, reflejadas respecto a la cabina
    p.mirrorX(cx, () => {
      for (let y = 0; y < 34; y++) {
        const bend = Math.round(4 * (1 - Math.abs(y - 16.5) / 16.5));
        p.r(1 + bend, y, 3, 1, PAL.panel);
        p.r(1 + bend, y, 1, 1, PAL.imperialDk);
      }
      p.r(1, 0, 3, 2, PAL.red);
      p.r(1, 32, 3, 2, PAL.red);
      p.r(5, 16, 7, 3, PAL.imperialDk);
    });
    tieCockpit(p, cx, cy, 6, PAL.red);
    p.r(cx - 2, cy - 2, 1, 1, PAL.redHi);
  },
};

/** TIE Bomber: dos cápsulas (cabina y bodega de minas) entre alas dobladas. */
export const TIE_BOMBER = {
  w: 32,
  h: 24,
  paint(p) {
    p.mirrorX(16, () => {
      p.r(0, 2, 3, 20, PAL.panel);
      p.r(1, 0, 2, 2, PAL.panel);
      p.r(1, 22, 2, 2, PAL.panel);
      p.r(0, 2, 1, 20, PAL.imperialDk);
      for (const y of [7, 12, 17]) p.r(0, y, 3, 1, PAL.imperialDk);
      p.r(3, 10, 4, 3, PAL.imperialDk);
    });
    p.r(14, 10, 4, 3, PAL.imperialDk);
    // Bodega de minas (derecha) y cabina (izquierda)
    p.c(20, 12, 4, PAL.imperialDk);
    p.r(18, 14, 5, 1, PAL.mid);
    p.c(12, 11, 4, PAL.imperial);
    p.c(12, 11, 2, PAL.ink);
    p.r(11, 11, 3, 1, PAL.window);
  },
};

export const ENEMY_ART = { TIE_FIGHTER, TIE_INTERCEPTOR, TIE_BOMBER };
