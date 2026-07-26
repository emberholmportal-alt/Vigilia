# ESCENARIOS.md — Las 6 acciones y el mundo curado de Velgrim

Documento **definitivo** de (1) las 6 acciones del juego y (2) el mapa curado de escenarios,
**tal como está construido y conectado hoy**. Complementa `WORLD.md` (ficción) y `ECONOMY.md`
(economía). Todos los mapas salen de `flareteam/flare-game` (CC-BY-SA), ya convertidos en
`public/maps/`. Estilo Kintara: cada escenario es un **realm con un propósito**, colgado del hub
por portales-waypoint.

> **Estado:** el mundo es **hermético** — 40 mapas alcanzables desde el hub, cero salas muertas,
> progresión nivel 1→17. Verificado por BFS sobre el grafo real de portales (ver "Cómo está
> cableado"). Si agregás o sacás un realm, re-corré esa verificación.

---

## Parte 1 — Las 6 acciones

Cada acción sube su **propio nivel** (XP por acción, cap **20** como Kintara), gatea nodos/recetas,
y usa **solo assets reales de Flare**. Reemplazan las 6 de Kintara (Combat/Woodcutting/Mining/
Fishing/Cooking/Smithing) por versiones dark-fantasy con arte. Cada oficio da además un **bonus
pasivo** (ver `client/data/stats.js` → `skillBonus`).

| # | Acción | Qué hacés | Dónde | Produce | Bonus pasivo | Kintara |
|---|---|---|---|---|---|---|
| 1 | **Combate** | Matar enemigos | zonas de combate | loot + oro + XP | +daño | Combat |
| 2 | **Excavación** | Picar vetas de mastite | cuevas / minas | mastite | +HP | Mining |
| 3 | **Herboristería** | Juntar Aloe / Hongos / Cristal de Maná | campo / bordes de agua | reactivos | +regen HP | Woodcutting |
| 4 | **Alquimia** | Botella + reactivos + Mortero → pociones | Hub (mesa) | pociones | +MP | Cooking |
| 5 | **Forja** | Mastite + materiales → equipo | Hub (Fragua) | equipo | +defensa | Smithing |
| 6 | **Saqueo** | Abrir cofres / desenterrar reliquias | dungeons / todo mapa | ítems + gemas | +magic-find | Fishing (loot) |

- **Combate, Excavación, Herboristería, Saqueo** ocurren **afuera** (en los escenarios).
- **Alquimia y Forja** ocurren en el **Hub** (estaciones), como en Kintara (Roast Pit / Forge).

---

## Parte 2 — El mundo (curado, tal como está)

### Hub — Triston

| Escenario | Mapa | Bioma | Función |
|---|---|---|---|
| **Triston** | `triston` | HERESY (arte propio) | Spawn, plaza, **Obelisco de Retorno** (recall + ofrendas), Fragua, Mesa de Alquimia, Mercado, Casa de Gremios, los **3 Guardianes** (quest de los Tres Nombres). Zona segura, sin combate. |

> Triston reemplazó a Lochport como hub (arte HERESY, escala de pueblo). Lochport ahora es un
> realm de combate del ramal costero. Black Oak City (100×100) es el "gran hub" temático a futuro.

### Las 6 ramas

Todo cuelga de Triston. Dos arcos curados en la plaza abren las ramas Oeste (gathering) y Este
(combate); de ahí se encadena el resto. Cada realm tiene su pad de **Volver a Triston** y responde
a la **Piedra de Retorno**.

#### Rama Oeste — gathering / progresión temprana (nivel 1–6)
| Escenario | Mapa | Nivel | Propósito |
|---|---|---|---|
| **Granja de Black Oak** | `black_oak_farm` | 1–3 | Inicio tranquilo. Herboristería + primeros duendes. Frontera a Black Oak City (salto deliberado a lv10). |
| **Sendero del Río** | `river_trail` | 3–5 | Herboristería junto al agua + nexo (Lochport, Campo Salado, Roca-Tormenta). |
| **Campo Salado** | `salted_field` | 4–6 | Combate no-muertos + saqueo. Nexo a Sta. María y Greenwood. |
| **Greenwood Point** | `greenwood_point` | pueblo | Segundo pueblo (servicios). Zona segura. |

#### Ramal Costero — Lochport (nivel 2–3, cuelga del Sendero del Río)
| Escenario | Mapa | Nivel | Propósito |
|---|---|---|---|
| **Lochport** | `lochport` | 2 | Puerto arruinado. Combate. Cruce al cementerio. |
| **Cementerio de Lochport** | `lochport_cemetery` | 2–3 | Combate no-muertos + saqueo. Cruce (cripta + ciénaga). Contrato de élite. |
| **Cripta Familiar** | `family_crypt` | 2 | Combate + saqueo (reliquias). |
| **Ciénaga de Merrimead** | `merrimead_swamp` | 2 | Combate + saqueo. |

#### Rama Este — combate (nivel 5–9, hub del ramal: la Cueva de Duendes)
| Escenario | Mapa | Nivel | Propósito |
|---|---|---|---|
| **Cueva de Duendes** | `goblin_cave` | 5–8 | Combate + primeras vetas de mastite. Nodo de 3 ramales (Minas, Templo, Perdición). |
| **Campamento de Duendes** | `goblin_camp` | 1–2 | Combate en superficie. Contrato de élite. |

#### Cluster Minero (nivel 5–6, cuelga de la Cueva de Duendes)
| Escenario | Mapa | Nivel | Jefe |
|---|---|---|---|
| **Minas Abandonadas** | `abandoned_mines` | 5 | — (hub del cluster, excavación) |
| **Minas de Ciénaga Negra** | `blackmire_mines` | 5 | — (excavación) |
| **Lago Kuuma** | `lake_kuuma` | 5 | — (bioma frío) |
| **Laguna Grot** | `grot_lagoon` | 5–6 | — (hoja) |
| **Fuerte Amir** | `fort_amir` | 7 | **Caballero de hueso** (dungeon final) |

#### Templo de Mez (nivel 6–9, cuelga de la Cueva de Duendes)
| Escenario | Mapa | Nivel | Jefe |
|---|---|---|---|
| **Templo: Sótano** | `temple_of_mez_1` | 7–8 | — |
| **Templo: Gran Salón** | `temple_of_mez_2` | 7–8 | — |
| **Templo: Entrada** | `temple_of_mez_3` | 8–9 | **Wyvern** (clímax del ramal) |
| **Nido de Hormigas León** | `antlion_nest` | 6 | — (antecámara, cuelga del Sótano) |

#### Los Tres Nombres — ruinas (nivel 9, quest de los Guardianes)
| Escenario | Mapa | Nivel | Jefe (elemental) |
|---|---|---|---|
| **Ruinas de Sta. María** | `st_maria_1` | 9 | **Wyvern del agua** (hielo) |
| **Minas de Perdición** | `perdition_mines` | 9 | **Wyvern de fuego** |
| **Paso Roca-Tormenta** | `stormrock_pass` | 9 | **Wyvern del viento** |

> Cada ruina es de un solo propósito: entrás, matás al guardián (revela el nombre sellado), volvés
> a Triston donde los 3 Guardianes cierran la quest.

#### Región de Black Oak — el descenso (nivel 9–17)
| Escenario | Mapa | Nivel | Jefe |
|---|---|---|---|
| **Black Oak City** | `black_oak_city` | 10 | — (zona insignia, 100×100) |
| **Cloacas Ruinosas** | `dilapidated_sewers` | 11 | **Zombi profano** |
| **Torre del Mago** (3 pisos) | `wizards_tower_1/2/3` | 11–12 | **Nigromante óseo** |
| **Cornisa del Sur** → **Cavernas de Mog** | `southern_ridge` / `mog_caverns` | 9–10 | **Nigromante** (en Mog) |
| **Nazia**: Tierras Altas → Subterráneo → Minas | `nazia_highlands/underground/mines` | 9–10 | **Señor de la guerra hobgoblin** (en las Minas) |
| **El Inframundo** | `underworld` | 13 | **Minotauro** |
| **Catacumbas del Inframundo** | `underworld_catacombs` | 13 | — |
| **Minas del Inframundo** | `underworld_mines` | 14 | — |
| **Fortaleza I** | `underworld_stronghold_1` | 14 | — |
| **Fortaleza II** | `underworld_stronghold_2` | 15 | **Caballero de hueso** |

#### Endgame — el fondo del mundo (nivel 14–17, cuelga del cluster profundo)
| Escenario | Mapa | Nivel | Jefe |
|---|---|---|---|
| **El Oasis** | `oasis` | 14 | **Wyvern** (baja de las Minas del Inframundo) |
| **El Pozo** | `the_pit` | 15–16 | **Minotauro del fondo** (lv17, el jefe más duro del juego) |

### Estaciones del Hub (no son mapas: son paneles/UI)
- **Fragua** → Forja. · **Mesa de Alquimia** → Alquimia. · **Mercado** → subastas en oro + oro↔$VEL.
- **Casa de Gremios** → fundar/unirse, contratos. · **Guardianes** → quest de los Tres Nombres + ofrenda.

---

## Resumen

- **40 mapas** curados y conectados · **13 jefes** permanentes de zona · **35 misiones** diarias.
- Progresión **nivel 1 → 17**. Rama oeste (gathering) y este (combate) desde el pueblo; el descenso
  de Black Oak lleva del 10 al 15, y el endgame (Oasis / Pozo) al 17.
- Además: contratos de élite diarios, los 3 Guardianes, y 6 oficios con bonus pasivos.

## Cómo está cableado (fuente de verdad técnica)

El mundo se cura con tres mecanismos, todos con una única fuente:

- **`PORTAL_REPLACE` / `PORTAL_EXTRA`** (`client/engine/Game.js`): la red de portales-waypoint.
  `REPLACE` reemplaza los portales nativos de un mapa (control total); `EXTRA` agrega encima de los
  nativos. Los pads se plantan en tiles **caminables + reachable** verificados contra la colisión.
- **`SPAWN_OVERRIDE`** (`server/world/combat.js`): muchos mapas de Flare quedaron fragmentados en
  islas de colisión al convertir (Flare teletransportaba entre salas). El override reancla el spawn
  del mapa a la **isla más poblada**, así la llegada del cliente coincide con el densificado del
  server (jefe + near-spawners). Es la razón por la que zonas como la Torre o el Templo funcionan.
- **`LEVEL_FLOOR`** (`server/world/combat.js`): sube cada spawner a un piso de nivel, para mapas con
  niveles mezclados (p.ej. `the_pit`: lv1 + lv15/16 → todo ≥15). Habilita el endgame.
- **`UNFINISHED`** (`client/engine/Game.js`): **sellado de bordes**. Blocklist de mapas convertidos
  pero sin terminar (vacíos, fragmentados o sin curar); `portalAllowed` los filtra en todos lados,
  así ningún portal del mundo lleva a una sala muerta. Cuando se pobla uno, se saca de la lista.

Los `MAP_BOSS` (jefes permanentes) también viven en `combat.js`; las misiones en `shared/missions.js`;
el lore de zona (frase al entrar) en `client/data/zonelore.js`.

## Reserva (mapas convertidos sin curar todavía)

Quedan mapas sanos en `UNFINISHED` para futuros clusters: **`stonewood`** (lv1, pocket temprano) y
un puñado de mapas vacíos o fragmentados (`the_breach`, `stormrock_ruins`, `st_maria_2/3`,
`torture_chambers`, el `iron_labyrinth`, los mapas del mod noname de Greenwood, etc.). No se generan
mundos proceduralmente: se van sumando a mano cuando el contenido lo pida (regla del CLAUDE.md).
