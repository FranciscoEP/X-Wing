# Code smells y refactor (iteración 2)

Revisión del código de la iteración 1 (la reescritura con ES modules). Cada smell indica dónde estaba, qué problema causaba y cómo quedó resuelto. Las pruebas viven en `tests/`.

## Bugs reportados al jugar

| Bug | Causa raíz | Arreglo | Prueba de regresión |
| --- | --- | --- | --- |
| Las balas enemigas casi nunca hacían daño (y algunas propias tampoco) | `overlaps(a, b, inset)` restaba el margen a **ambos** rectángulos: un láser de 3 px con margen 14 quedaba con altura negativa y solo acertaba en una franja de unos 15 px | `overlaps` ya no tiene margen; las hitboxes se reducen solo en el objetivo con `shrink()` (`HITBOX` en `config.js`) | `combat.test.js`: «una bala dirigida al centro…», «un TIE disparando a un jugador quieto…» |
| La Estrella de la Muerte no recibía daño | El puerto está dibujado dentro de la esfera: el disparo horizontal tocaba antes el blindaje del borde y rebotaba | Lo que entra en la esfera a la altura del puerto cuenta como impacto (`DeathStar.hitTest`) | `bosses.test.js`: «lo que entra en la esfera a la altura del puerto…», «apuntar el centro de la nave al puerto…» |
| Apuntar al puerto con el centro de la nave fallaba igual | Los cañones estaban en las puntas de las alas (±28 px) y ambos láseres pasaban por fuera del puerto (±14 px) | `PLAYER.CANNON_OFFSET = 18` y tolerancia de puntería del puerto | ídem |
| Los torpedos «no se veían» | El torpedo era instantáneo: un destello sin proyectil | `Torpedo` es una entidad que vuela y detona con onda expansiva visible | `combat.test.js`: «el torpedo es un proyectil visible…» |

## Smells de diseño

| # | Smell | Dónde estaba | Problema | Refactor |
| --- | --- | --- | --- | --- |
| 1 | **God class** | `Game.js` (≈400 líneas) | Bucle, estados, reglas de combate, colisiones, power-ups, puntuación, audio y dibujo en una clase: cualquier cambio podía romper otra cosa | Dividido en `sim/World.js` (reglas), `sim/collisions.js`, `sim/powerups.js`, `render/Renderer.js` y un `Game.js` que solo es la máquina de estados |
| 2 | **Lógica y presentación mezcladas** | `update()` y `draw()` en cada entidad | Imposible probar la lógica sin canvas | Entidades en `sim/` sin dibujo; dibujo en `render/entities.js` y `render/bosses.js` |
| 3 | **Efectos secundarios dentro de la lógica** | Los jefes llamaban a `world.particles` / `world.effects`; `Game` reproducía sonidos dentro del combate | La simulación dependía de la presentación | La simulación emite eventos (`EventBus`); `render/feedback.js` decide qué se ve y se oye |
| 4 | **Dependencias ocultas del navegador** | `document`, `localStorage`, `new Audio`, `window` dentro de las clases | No se podía ejecutar en Node ni con dobles | Inyección de dependencias: `Game({ input, audio, renderer, storage })`; `main.js` es el único que toca el DOM |
| 5 | **Aleatoriedad no controlable** | `Math.random()` disperso | Pruebas no reproducibles | `core/random.js` con fuente reemplazable y generador con semilla |
| 6 | **Números mágicos** | Daños 30/25/60/80, curación 40, máx. 5 bombas, márgenes 4/12/14/16, velocidades, tiempos | Balancear el juego obligaba a buscar en el código | Todo en `config.js` (`COMBAT`, `HITBOX`, `TORPEDO`, `BOSS`, `POWERUP_ITEM`) o en constantes con nombre al inicio de cada módulo |
| 7 | **`switch`/`if` por tipo** | `createBoss` con `switch`; `applyPowerUp` con `if (type === 'REPAIR')` | Añadir un tipo obligaba a tocar varios sitios | Registros: `BOSS_CLASSES`, `BOSS_RENDERERS`, `POWERUP_EFFECTS` |
| 8 | **Estado ajeno mutado desde fuera** | `phases.damageTaken += …`, `enemy.fromWave = …` tras construir | Invariantes rotas fácilmente | `phases.recordDamage()`, `new Enemy(type, difficulty, { fromWave })` |
| 9 | **Objeto falso para cumplir una interfaz** | `boss.hitTest({ cx, cy, x, y, … })` armado a mano para el jugador | Interfaz inconsistente (unas veces `cx`, otras `x`) | `hitTest(rect)` usa `centerOf(rect)`; `player.hitbox(inset)` devuelve un rectángulo real |
| 10 | **Law of Demeter / acoplamiento del HUD** | `drawHUD(ctx, game)` leía `game.player`, `game.phases`, `game.audio.muted`… | El HUD conocía toda la estructura interna | `buildHudModel(world, opts)` → modelo plano probado en `game.test.js` |
| 11 | **Strings mágicos** | `'WAVE'`, `'BOSS'`, `'intro'`, `'hit'`, `'armor'`, `'charging'` | Una errata no fallaba hasta jugar | `PHASE_TYPE`, `PHASE_STATUS`, `HIT`, `LASER_STATE`, `SCENE`, `OUTCOME` |
| 12 | **Acoplamiento temporal** | `game.lastClearFlawless` se guardaba solo para el cartel | Estado que dependía del orden de llamadas | Vive en `PhaseManager.lastClearFlawless`, junto a quien lo calcula |
| 13 | **Nombres engañosos** | «bomb» en el código vs «torpedo» en la UI | Confusión al leer | Todo se llama torpedo (`KEYS.TORPEDO`, `torpedoCount`, `POWERUPS.TORPEDO`) |
| 14 | **Código muerto** | Assets de balas sin usar, `randInt`, `PLAYER` reexportado | Ruido | Eliminados |
| 15 | **Basura constante en audio** | `new Audio()` por cada disparo | Presión sobre el recolector (unos 12 objetos/s) | Pool fijo de 4 voces por efecto |
| 16 | **Configuración sin validar** | `config.js` | Una referencia rota (fase → jefe inexistente) fallaba en mitad de la partida | `config.test.js` valida fases, jefes, renderers y power-ups |

## Memoria

- Medido con `node --expose-gc`: 30 partidas completas seguidas mantienen el heap estable (unos 4.5 MB) con un pico de unas 36 entidades vivas.
- `memory.test.js` verifica que las colecciones están acotadas, que balas, partículas y ondas expiran y que cada partida usa un bus de eventos nuevo (las anteriores no quedan suscritas).
