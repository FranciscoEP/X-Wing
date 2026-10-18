# X-Wing: Asalto a la Estrella de la Muerte

Shooter espacial en Canvas + JavaScript (ES modules, sin dependencias ni build). Pilota el X-Wing a través de 5 fases: dos oleadas, Darth Vader, el Destructor Estelar y la carrera final por la trinchera de la Estrella de la Muerte.

**Juega aquí:** https://franciscoep.github.io/X-Wing/

## Controles

| Acción | Teclas |
| --- | --- |
| Mover | `WASD` o flechas |
| Disparar | `J` o `Espacio` (mantener) |
| Torpedo protón (explota en área) | `K` |
| Pausa | `P` o `Esc` (`Q` en pausa vuelve al menú) |
| Silenciar | `M` o el botón «Sonido» bajo el juego |

## Enemigos: cada uno con su firma

| Enemigo | Cómo ataca | Aviso | Cómo esquivarlo |
| --- | --- | --- | --- |
| TIE Fighter | Par de láseres rectos, solo cuando te tiene enfrente | Sus cañones brillan 0,3 s | Sal de su línea |
| TIE Interceptor | Cruza la pantalla en diagonal y suelta un abanico de 3 al pasar a tu altura | Línea roja por la diagonal antes de entrar | Apártate de la diagonal |
| TIE Bomber | Suelta minas que estallan en un radio | La mina parpadea cada vez más rápido | Destrúyela de un disparo o rodéala |

Cada nave dispara a su propio ritmo (`sim/ai/weapons.js`). Los TIE e Interceptores que salen de la pantalla sin ser derribados **dan la vuelta y vuelven a atacar** por la derecha (una flecha roja avisa por dónde): 0 veces en Fácil, 1 en Normal y 2 en Difícil. Las formaciones (V, columna, tenaza, escalón, hostigamiento, pasada) y la ruptura al caer el líder siguen en `sim/ai/`. Darth Vader tiene tres etapas: 1) te persigue y dispara pares rápidos (sus cañones brillan antes); 2) además embiste tras una franja roja de aviso; 3) suma escudo, dos escoltas y una mira que te sigue 1,5 s, se fija y dispara una ráfaga a ese punto: muévete en cuanto se ponga blanca.

El **Destructor Estelar** se desmonta por partes: tres torretas (abanico, ráfaga apuntada y rayo de barrido que marca antes su cono) y un hangar que lanza TIE. Los láseres pasan por encima del casco y solo dañan las partes; cada parte destruida apaga su ataque. Cuando caen las tres torretas, el puente de mando pierde el blindaje: destrúyelo para ganar.

El final es la **carrera por la trinchera**: al entrar se repara el escudo y recibes 2 torpedos; luego llegan torretas en las paredes (trío de rayos con aviso) y Vader se pone detrás. A los 38 s aparece el puerto de escape: los láseres rebotan, solo un torpedo lo destruye. Si la cuenta de 60 s llega a cero, la Estrella de la Muerte dispara su superláser y pierdes.

Power-ups que sueltan los enemigos: disparo triple, fuego rápido, escudo, reparación y torpedos extra. 

## Ejecutar en local

Los ES modules no cargan desde `file://`, así que sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y abre http://localhost:8000. Parámetros útiles: `?silencio` arranca sin audio, `?fase=N` empieza en la fase N `?debug` expone el juego en la consola como `window.xwing`.

## Gráficos: arcade retro de 16 bits

Dirección aprobada en el [documento de diseño](https://claude.ai/code/artifact/b6853482-e7e5-4908-934b-7276a5f3f0c6).

- El juego se dibuja en un búfer de **480×270 píxeles** que se amplía ×2, ×3… sin suavizar (pixel perfect). La simulación sigue en 960×540 unidades; `render/pixel.js` las convierte.
- Las naves son **pixel art dibujado por código** (`render/art/pixelArt.js`) con una paleta fija (`render/art/palette.js`), contorno automático de 1 px y versión de destello para los impactos.
- Explosiones, chispas, láseres y anillos son pixel art; sin desenfoques, brillos ni distorsiones.
- La interfaz HTML usa la misma cuadrícula (`--px`) y tipografías pixel (Press Start 2P y VT323).

## Balance de dificultad

La dificultad se calibra con un **piloto experto** automático (`js/sim/ai/ExpertPilot.js`) que juega sin trampas: simula la física de la nave, esquiva balas, minas, rayos y la mira de Vader, y usa torpedos. Tiene perfiles de jugador «bueno» y «promedio» con tiempo de reacción, atención limitada, imprecisión y errores ocasionales. Son supuestos razonables, no datos reales de jugadores.

```bash
npm run balance
```

juega 30 partidas por dificultad y perfil en unos segundos y muestra victorias, vidas perdidas, daño y en qué fase se pierde. Metas (verificadas en `tests/balance.test.js`):

| Dificultad | Buen piloto | Piloto promedio |
| --- | --- | --- |
| Fácil | ≥ 95 % de victorias | ≥ 90 % |
| Normal | ≥ 80 % | — |
| Difícil | 5–35 % | ≤ 10 % |

Además, en Difícil la trinchera final debe causar al menos el 20 % de las derrotas: el final es el momento de máxima intensidad. Las palancas están en `DIFFICULTIES` (`config.js`).

## Pruebas

Sin dependencias: usan el runner nativo de Node (≥ 20).

```bash
npm test
```

Incluyen pruebas unitarias (jugador, enemigos, jefes, fases, power-ups, input, audio, storage), la IA (puntería, formaciones, esquiva, fases de Vader), los modelos de vista de la interfaz, regresiones de los bugs reportados, validación de `config.js`, pruebas de memoria y partidas completas simuladas con piloto automático en las tres dificultades y con 10 semillas distintas. Se ejecutan en GitHub Actions en cada push y PR.

## Arquitectura

```
js/
├── main.js              # Único punto con DOM: crea dependencias y arranca Game
├── Game.js              # Máquina de estados (menú/juego/pausa/fin) y bucle
├── config.js            # Todo el balance: fases, daños, hitboxes, power-ups…
├── core/                # Input, audio, storage, EventBus, random con semilla, utilidades
├── sim/                 # Simulación pura (sin DOM, se ejecuta en Node)
│   ├── World.js         # Una partida: entidades, combate, puntuación, eventos
│   ├── collisions.js    # Reglas de colisión
│   ├── powerups.js      # Registro de efectos de power-ups
│   ├── PhaseManager.js  # Secuencia de fases y escuadrones
│   ├── ai/              # aim (puntería predictiva), evasion, movement, formations
│   ├── entities/        # Player, Enemy, Bullet, Torpedo, PowerUp
│   └── bosses/          # Boss (base), TieAdvanced, StarDestroyer, DeathStar, registry
├── render/              # Canvas: mundo, jefes, partículas, efectos, fondo
│   ├── art/             # Pixel art por código: paleta, naves y SpriteCache (contorno, destello)
│   ├── pixel.js         # Primitivas en píxeles enteros del búfer de 480×270
│   └── feedback.js      # Traduce eventos de la simulación a efectos y sonido
└── ui/                  # Cabina en HTML+CSS
    ├── viewModel.js     # Funciones puras: qué mostrar (probadas en Node)
    └── CockpitUI.js     # Pinta el DOM solo cuando algo cambia
css/style.css            # Estilo de cabina; escala con el visor (container queries)
tests/                   # node --test
docs/code-smells.md      # Smells encontrados y cómo se resolvieron
```

La simulación (`sim/`) no sabe nada del navegador: recibe controles abstractos (`{ moveX, moveY, shoot, torpedo }`) y publica eventos. Eso permite probarla y ejecutar partidas completas en milisegundos.

### Cómo extender

- **Nueva fase:** añade una entrada a `PHASES` en `config.js`.
- **Nuevo enemigo:** entrada en `ENEMY_TYPES`.
- **Nuevo jefe:** extiende `Boss` en `sim/bosses/`, regístralo en `sim/bosses/registry.js`, añade sus datos a `BOSS_TYPES` y su dibujo a `BOSS_RENDERERS` (`render/bosses.js`). `config.test.js` falla si falta alguna pieza.
- **Nuevo power-up:** entrada en `POWERUPS` y su efecto en `sim/powerups.js`.
- **Nueva formación:** función en `LAYOUTS` (`sim/ai/formations.js`) y su nombre en `FORMATION`; úsala en `squadrons` de una fase.
- **Nuevo aviso en la cabina:** entrada en `ALERTS` (`ui/viewModel.js`) asociada a un evento de la simulación.
