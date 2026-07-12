# ESCENARIOS.md — Las 6 acciones y todos los escenarios de Vigilia

Documento **definitivo** de (1) las 6 acciones del juego y (2) el mapa curado de escenarios.
Complementa `WORLD.md` (ficción) y `ECONOMY.md` (economía). Todos los mapas listados son
**reales y ya convertidos** en `public/maps/` (56 en total; acá se curan los que forman el
mundo jugable). Estilo Kintara: cada escenario es un **realm con un propósito**, colgado del
hub por portales.

---

## Parte 1 — Las 6 acciones (definitivas)

Cada acción sube su **propio nivel** (XP por acción, cap **20** como Kintara), gatea
nodos/recetas, y usa **solo assets reales de Flare** (los iconos de recurso que falten se
traen CC0). Reemplazan las 6 de Kintara (Combat/Woodcutting/Mining/Fishing/Cooking/Smithing)
por versiones que encajan con el dark-fantasy y tienen arte.

| # | Acción | Qué hacés | Dónde | Produce | Kintara |
|---|---|---|---|---|---|
| 1 | **Combate** | Matar enemigos | zonas de combate | loot + oro + XP | Combat |
| 2 | **Excavación** | Picar **vetas de mastite** | cuevas / minas | mastite (materia prima) | Mining |
| 3 | **Herboristería** | Juntar Aloe / Hongos / Cristal de Maná | campo / bordes de agua | reactivos | Woodcutting |
| 4 | **Alquimia** | Botella + reactivos + Mortero → pociones | Hub (mesa de alquimia) | pociones | Cooking |
| 5 | **Forja** | Mastite + materiales → equipo | Hub (Fragua) | equipo (mastite gear) | Smithing |
| 6 | **Saqueo** | Abrir cofres / desenterrar reliquias | dungeons / todo mapa | ítems raros + gemas | Fishing (loot) |

- **Combate, Excavación, Herboristería, Saqueo** ocurren **afuera** (en los escenarios).
- **Alquimia y Forja** ocurren en el **Hub** (estaciones), como en Kintara (Roast Pit / Forge).

---

## Parte 2 — Los escenarios (mundo curado)

### Hub
| Escenario | Mapa | Bioma | Función |
|---|---|---|---|
| **Lochport** | `lochport` | grassland 50×60 | Spawn, plaza, Obelisco de Retorno, **2 portales**, Fragua (Forja), Mesa de Alquimia, Mercado, Casa de Gremios, los 3 Guardianes. Zona segura. |

> El gran hub futuro es **Black Oak City** (`black_oak_city`, grassland 100×100) cuando el
> mundo crezca. Por ahora Lochport es más chico y manejable.

### Realms (por portal, progresión por nivel)

| # | Escenario | Mapa | Bioma | Nivel | Propósito / acciones | Análogo Kintara |
|---|---|---|---|---|---|---|
| 1 | **Granja de Black Oak** | `black_oak_farm` | grassland 100×100 | 1–3 | Inicio tranquilo. **Herboristería** + primeros duendes. **← Portal Oeste** | Whisperwood |
| 2 | **Sendero del Río** | `river_trail` | grassland 80×40 | 3–5 | **Herboristería** (hierbas junto al agua) + tránsito | The Pond |
| 3 | **Campo Salado** | `salted_field` | grassland 60×60 | 4–6 | **Combate** (no-muertos) + **Saqueo** | — |
| 4 | **Cueva de Duendes** | `goblin_cave` | cave 48×48 | 5–8 | **Combate** + primeras **vetas de mastite**. Zona de riesgo (tumba). **← Portal Este** | Wilderness |
| 5 | **Minas Abandonadas** | `abandoned_mines` | cave 80×100 | 9–12 | **Excavación (mastite)** principal + esqueletos | Emberstone |
| 6 | **Cripta Familiar** | `family_crypt` | dungeon 38×65 | 7–10 | **Combate** + **Saqueo** (reliquias en cofres) | — |
| 7 | **Cementerio de Lochport** | `lochport_cemetery` | grassland 60×80 | 10–13 | **Combate** no-muertos + **Saqueo** | — |
| 8 | **Nido de Hormigas León** | `antlion_nest` | cave 80×80 | 12–15 | **Combate** + jefe (reina) + **Excavación** | — |
| 9 | **Torre del Mago** | `wizards_tower_1/2/3` | dungeon 100×100 | 14–18 | **Combate** + jefe + botín alto | — |
| 10 | **Lago Kuuma** (bioma frío) | `lake_kuuma` | snowplains 132×132 | 20+ | Nuevo bioma, nuevos materiales, veteranos | **Frostmere** |
| 11 | **Laberinto de Hierro** | `iron_labyrinth_f1/2/3` | ruins 164×164 | 18+ | Endgame: minotauro + jefe final | — |

### Estaciones del Hub (no son mapas: son paneles/UI)
- **Fragua** → Forja (craftear/mejorar equipo con mastite).
- **Mesa de Alquimia** → Alquimia (pociones con reactivos).
- **Mercado** → vender/comprar (Mercader ahora; Casa de Mercado P2P con servidor).
- **Casa de Gremios** → fundar/unirse, contratos, ranking.
- **Guardianes** → ofrenda de oro por buff del día.

---

## Estado de cada escenario (qué está listo)

| Sistema que necesita | Escenarios que se habilitan |
|---|---|
| **Ya jugable** (render + culling + A* + loot de cofres) | Hub + cualquiera de los 11 (se recorren, tienen cofres) |
| **Falta Combate** (Fase 5) | Cacería y jefes en 3–11 |
| **Falta Excavación/Herboristería** (nodos + skills) | recursos en 1, 2, 4, 5, 8 |
| **Falta Forja/Alquimia** (estaciones) | crafteo en el Hub |
| **Falta Servidor** (Fase 7) | Mercado P2P, otros jugadores, PvP/Arena |

## Portales: destino definido

- **Portal del Oeste** (`lochport` 20,22) → **Granja de Black Oak** (`black_oak_farm`) — inicio/gathering.
- **Portal del Este** (`lochport` 45,30) → **Cueva de Duendes** (`goblin_cave`) — peligro/combate.

Los demás realms se alcanzan encadenando portales desde cada zona (los mapas ya traen sus
propios portales convertidos) o, a futuro, desde un **mapa del mundo** en el Obelisco.

## Reserva (mapas convertidos sin usar todavía)

Quedan **~40 mapas** más para expandir (`oasis`, `stonewood`, `merrimead_swamp`,
`the_breach`, `underworld*`, `fort_amir/nasu`, `temple_of_mez_*`, `st_maria_*`,
`stormrock_*`, `grot_lagoon`, etc.). No se generan mundos proceduralmente: se van sumando
estos mapas hechos a mano a medida que el contenido lo pida (regla del CLAUDE.md).
