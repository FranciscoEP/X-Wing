function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    // Si falla una imagen el juego sigue: las entidades tienen un dibujo de respaldo.
    img.onerror = () => {
      console.warn(`No se pudo cargar ${src}`);
      resolve(null);
    };
    img.src = src;
  });
}

export async function loadImages(map) {
  const entries = await Promise.all(
    Object.entries(map).map(async ([key, src]) => [key, await loadImage(src)])
  );
  return Object.fromEntries(entries);
}
