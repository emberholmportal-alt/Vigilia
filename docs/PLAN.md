# PLAN.md — Fases

Cada fase tiene un **criterio de aceptación verificable**. No pases a la siguiente sin
cumplirlo. No trabajes en dos fases a la vez.

> ## Estado (2026)
> **Las fases 0–7 están construidas.** El juego es un MMORPG jugable: renderer isométrico + paperdoll
> de 8 direcciones, hub vivo (Triston), 552 ítems, combate autoritativo con jefes, progresión +
> razas + gremios + misiones diarias, y multijugador WebSocket. El mundo tiene **40 mapas** curados
> y sellados (ver `ESCENARIOS.md`).
>
> Se construyó además, **encima del plan original**: economía con sellos, marketplace (subastas en
> oro + oro↔$VEL no-custodial, dormido), trade P2P, selección de servidor, y wallet Sign-In-With-
> Solana. Lo único pendiente de verdad: **calibrar y encender el gate $VEL** cuando exista el token.

---

## Fase 0 — Pipeline y andamiaje  ✅

**Objetivo:** que los assets de Flare entren al proyecto y salgan como JSON + PNG.

- [ ] `vendor/flare-game` clonado y en `.gitignore`.
- [ ] `tools/extract_flare.py` corre y genera `public/assets/` con `assets.json`.
- [ ] `tools/convert_maps.py --all` genera `public/maps/` (56 mapas).
- [ ] Vite + React + Pixi.js v8 arrancan. Canvas a pantalla completa, sin scroll en móvil.
- [ ] `CREDITS.md` con la atribución CC-BY-SA de Flare.

**Aceptación:** `public/assets/assets.json` lista ≥60 capas de avatar, ≥25 enemigos y
≥6 tilesets. `public/maps/black_oak_city.json` tiene 3 capas de 100×100.

---

## Fase 1 — Renderer isométrico  ✅

**Objetivo:** Black Oak City dibujada, real, recorrible.

- [ ] Cargar `black_oak_city.json` + `tileset_grassland`.
- [ ] Dibujar capa `background`, después `object` con **depth sort por `x+y`**.
- [ ] Colisión desde la capa `collision` (`>0` = bloqueado).
- [ ] Cámara que sigue al jugador, con lerp. Culling: no dibujes lo que no se ve.
- [ ] Click/tap para caminar. Pathfinding A* sobre la grilla de colisión (no line-of-sight:
      la ciudad tiene paredes y el jugador se va a trabar).

**Aceptación:** recorrés la ciudad entera sin atravesar paredes, a 60fps en un Samsung de
gama media. Los árboles y casas te tapan cuando pasás por detrás.

---

## Fase 2 — Paperdoll  ✅

**Objetivo:** el personaje se ve, se mueve y **cambia de aspecto al equiparse**.

- [ ] Componer al héroe desde `assets.json`: capas por slot, orden según dirección
      (`hero_layers` — ver CLAUDE.md).
- [ ] El cuerpo base (`default_chest/legs/hands/feet`) va **siempre debajo** de la armadura.
- [ ] Animaciones: `stance`, `run`, `swing`, `cast`. Timing desde el `ms` del manifest.
- [ ] 8 direcciones desde el vector de movimiento en **espacio de pantalla**, no de mapa.
- [ ] **Optimización:** cuando el equipo cambia, pre-componé el héroe a una sola
      `RenderTexture` por dirección/frame. No dibujes 7 capas por frame.

**Aceptación:** te ponés la coraza de placas y el sprite cambia al instante, en las 8
direcciones, sin caída de fps.

---

## Fase 3 — La ciudad viva  ✅

**Objetivo:** que Black Oak City no sea un decorado. **Esta fase es la que define el juego.**

- [ ] NPCs de `black_oak_city.json` renderizados con sus sprites reales.
- [ ] **Patrullas:** cada NPC camina entre 2-4 puntos de su distrito. Se paran, miran, siguen.
- [ ] **Diálogo** al tocarlos: 2-4 líneas, en español, con personalidad. Nada de "Hola,
      aventurero".
- [ ] **Rumores del día:** los aldeanos dicen frases que apuntan a la zona de la daily.
- [ ] **Ciclo día/noche:** tinte del canvas + ventanas iluminadas de noche.
- [ ] Ambiente: humo de la fragua, hojas, pájaros. Partículas de Pixi, baratas.
- [ ] Mercader con stock que rota cada día real.

**Aceptación:** un tester camina 2 minutos por la ciudad **sin pelear** y no se aburre.
Si se aburre, la fase no está terminada.

---

## Fase 4 — Ítems, inventario y equipo  ✅

- [ ] Parsear los **552 ítems** de `mods/empyrean_campaign/items/categories/*.txt` a
      `shared/items.json` (id, nombre ES, icono, slot, tier, stats, precio, capa del paperdoll).
- [ ] Traducir nombres al español. `Warlord Chain Cuirass` → `Coraza de cadenas del Caudillo`.
- [ ] Inventario 30 slots + 7 slots de equipo + oro.
- [ ] Rareza con color de borde (común / fino / encantado / legendario / único).
- [ ] Tooltip con stats y comparación contra lo equipado ("+4 def / −2 des").
- [ ] Loot en el suelo con brillo, se recoge al caminar encima.
- [ ] **Servidor autoritativo:** el cliente pide equipar, el servidor valida y responde.

**Aceptación:** matás un esqueleto, cae una pieza, la equipás y el sprite cambia. Todo el
recorrido validado en el servidor.

---

## Fase 5 — Combate y enemigos  ✅

- [ ] Spawners desde el JSON del mapa (`category`, `level` [min,max], `n` [min,max]).
- [ ] IA: idle → patrulla → persecución (aggro) → ataque → retorno al spawn.
- [ ] Cuerpo a cuerpo con cooldown y animación `swing`. Críticos.
- [ ] Hechizos: `cast` + proyectil + impacto. Maná y cooldowns.
- [ ] Muerte del jugador: respawn en el **Obelisco de Retorno**, penalidad de oro.
- [ ] Barras de vida, números de daño flotantes, feedback de golpe (flash rojo).

**Aceptación:** una pelea contra 3 duendes se siente peligrosa a nivel 1 y trivial a nivel 8.

---

## Fase 6 — Progresión  ✅

- [ ] Niveles, curva de XP, puntos de atributo (FUE/DES/INT/VIT).
- [ ] Razas con sus modificadores (ver WORLD.md).
- [ ] Misiones diarias: 3 del pool, reset a medianoche del servidor, progreso persistido.
- [ ] Gremios: fundar, unirse, niveles, ventajas, depósito, contratos, ranking.
- [ ] PostgreSQL: personajes, inventario, gremios, progreso de misiones.

**Aceptación:** cerrás el navegador, volvés al día siguiente, tenés dailies nuevas y todo
tu progreso intacto.

---

## Fase 7 — Multijugador  ✅

- [ ] Servidor WebSocket autoritativo. Sala por mapa.
- [ ] Ver a otros jugadores moverse, con su paperdoll real.
- [ ] Interés espacial: solo mandá updates de lo que el jugador ve
      (Flare usa 23×19 tiles; empezá con eso).
- [ ] Chat de ciudad y chat de gremio.
- [ ] Interpolación de posiciones remotas. Nada de teleports.

**Aceptación:** dos navegadores, dos jugadores, se ven, se cruzan en la plaza y se
distinguen por la armadura.

---

## Ya construido encima del plan

Trade P2P entre jugadores · casa de subastas en oro · marketplace oro↔$VEL (no-custodial, dormido) ·
wallet Sign-In-With-Solana · selección de servidor · economía de sellos + ofrendas.

**Gremios (expansión social):** rangos (fundador/oficial/miembro) · invitaciones (tocando a un
jugador) · expulsar/transferir/herencia del liderazgo · chat de gremio · aporte por miembro ·
ranking por **Poder** (5 ejes sin tope: Σniveles, promedio, miembros, nivel de gremio, oro donado) ·
nivel de gremio sin tope (prestigio pasado n5).

**Social/mundo:** ficha pública al inspeccionar a otro jugador · hazañas (jefes derrotados +
zona más profunda), server-autoritativas y persistidas · estamina al correr.

**Mundo:** 40 mapas conectados y sellados (sin fugas a mapas sin terminar) · spawn/nivel
corregidos por mapa · docs in-game (Cómo Jugar + Documentación) bilingües.

## Lo que NO hacemos todavía

PvP · Arena · crafteo profundo · monturas · raids · pool colaborativo de gremio.
Y el gate $VEL: **calibrar y encender** cuando exista el token (único pendiente de la hoja de ruta).
