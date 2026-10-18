# X-Wing: Asalto a la Estrella de la Muerte

Shooter espacial en Canvas + JavaScript (ES modules, sin dependencias ni build). Pilota el X-Wing a través de 5 fases: dos oleadas de TIE y tres jefes (TIE Advanced de Vader, Destructor Estelar y la Estrella de la Muerte).

**Juega aquí:** https://franciscoep.github.io/X-Wing/

## Controles

| Acción | Teclas |
| --- | --- |
| Mover | `WASD` o flechas |
| Disparar | `J` o `Espacio` (mantener) |
| Torpedo protón (limpia la pantalla) | `K` |
| Pausa | `P` o `Esc` (`Q` en pausa vuelve al menú) |
| Silenciar | `M` |

Power-ups que sueltan los enemigos: disparo triple, fuego rápido, escudo, reparación y torpedos extra. En la Estrella de la Muerte solo el **puerto de escape** (círculo amarillo) recibe daño; esquiva el superláser cuando veas la línea verde punteada.

## Ejecutar en local

Los ES modules no cargan desde `file://`, así que sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y abre http://localhost:8000.

## Estructura

```
js/
├── main.js              # Arranque: carga assets y crea el juego
├── config.js            # Constantes: fases, dificultades, power-ups, assets
├── Game.js              # Bucle, estados (menú/juego/pausa/fin) y colisiones
├── core/                # Input, audio, carga de imágenes, storage, utilidades
├── entities/            # Player, Enemy, Bullet, PowerUp
│   └── bosses/          # Boss (base), TieAdvanced, StarDestroyer, DeathStar
├── systems/             # PhaseManager, Particles, Effects, Background
└── ui/                  # HUD, pantallas y helpers de dibujo
```

Para añadir una fase basta con agregar una entrada a `PHASES` en `config.js`; para un jefe nuevo, extiende `Boss` y regístralo en `entities/bosses/index.js`.
