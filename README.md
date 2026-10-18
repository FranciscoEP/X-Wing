# X-Wing: Asalto a la Estrella de la Muerte

Shooter espacial en Canvas + JavaScript (ES modules, sin dependencias ni build). Pilota el X-Wing a través de 5 fases: dos oleadas de TIE y tres jefes (TIE Advanced de Vader, Destructor Estelar y la Estrella de la Muerte).

**Juega aquí:** https://franciscoep.github.io/X-Wing/

## Controles

| Acción | Teclas |
| --- | --- |
| Mover | `WASD` o flechas |
| Disparar | `J` o `Espacio` (mantener) |
| Torpedo protón (explota en área) | `K` |
| Pausa | `P` o `Esc` (`Q` en pausa vuelve al menú) |
| Silenciar | `M` o el botón «Sonido» bajo el juego |

## Inteligencia artificial enemiga

- **Puntería predictiva:** TIEs y jefes disparan a donde *vas a estar* (intercepción). La dificultad gradúa cuánto anticipan (`aimLead`).
- **Formaciones:** las oleadas llegan en escuadrones — V, columna serpenteante, tenaza (entran por arriba y abajo y te encierran) y picada (se lanzan hacia tu posición).
- **Esquiva:** los interceptores (y Vader) detectan tus láseres y se apartan; después necesitan recuperarse, así que una segunda ráfaga sí los alcanza.
- **Fases de Vader:** persecución → embestida anunciada con una franja roja (¡muévete!) → escudo deflector intermitente y escoltas. El escudo se apaga durante la embestida: es tu ventana.

Power-ups que sueltan los enemigos: disparo triple, fuego rápido, escudo, reparación y torpedos extra. En la Estrella de la Muerte solo el **puerto de escape** (círculo amarillo) recibe daño; esquiva el superláser cuando veas la línea verde punteada.

## Ejecutar en local

Los ES modules no cargan desde `file://`, así que sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y abre http://localhost:8000. Parámetros útiles: `?silencio` arranca sin audio, `?fase=N` empieza en la fase N y `?debug` expone el juego en la consola como `window.xwing`.

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
│                        # feedback.js traduce eventos de la simulación a efectos y sonido
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
