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

Power-ups que sueltan los enemigos: disparo triple, fuego rápido, escudo, reparación y torpedos extra. En la Estrella de la Muerte solo el **puerto de escape** (círculo amarillo) recibe daño; esquiva el superláser cuando veas la línea verde punteada.

## Ejecutar en local

Los ES modules no cargan desde `file://`, así que sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y abre http://localhost:8000. Parámetros útiles: `?silencio` arranca sin audio y `?fase=N` empieza en la fase N.

## Pruebas

Sin dependencias: usan el runner nativo de Node (≥ 20).

```bash
npm test
```

Incluyen pruebas unitarias (jugador, enemigos, jefes, fases, power-ups, input, audio, storage), regresiones de los bugs reportados, validación de `config.js`, pruebas de memoria y partidas completas simuladas con piloto automático en las tres dificultades. Se ejecutan en GitHub Actions en cada push y PR.

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
│   ├── PhaseManager.js  # Secuencia de fases
│   ├── entities/        # Player, Enemy, Bullet, Torpedo, PowerUp
│   └── bosses/          # Boss (base), TieAdvanced, StarDestroyer, DeathStar, registry
├── render/              # Dibujo: Renderer, entidades, jefes, partículas, efectos, fondo
│                        # feedback.js traduce eventos de la simulación a efectos y sonido
└── ui/                  # HUD (con modelo de vista) y pantallas
tests/                   # node --test
docs/code-smells.md      # Smells encontrados y cómo se resolvieron
```

La simulación (`sim/`) no sabe nada del navegador: recibe controles abstractos (`{ moveX, moveY, shoot, torpedo }`) y publica eventos. Eso permite probarla y ejecutar partidas completas en milisegundos.

### Cómo extender

- **Nueva fase:** añade una entrada a `PHASES` en `config.js`.
- **Nuevo enemigo:** entrada en `ENEMY_TYPES`.
- **Nuevo jefe:** extiende `Boss` en `sim/bosses/`, regístralo en `sim/bosses/registry.js`, añade sus datos a `BOSS_TYPES` y su dibujo a `BOSS_RENDERERS` (`render/bosses.js`). `config.test.js` falla si falta alguna pieza.
- **Nuevo power-up:** entrada en `POWERUPS` y su efecto en `sim/powerups.js`.
