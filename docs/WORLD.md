# WORLD.md — El mundo de Vigilia

## Premisa

Empyrea cayó. Los muertos no descansan, los duendes bajaron de las minas y algo antiguo
respira en el Laberinto de Hierro. **Black Oak City** es lo último que queda en pie: la
última ciudad con murallas, con fragua encendida y con gremios que todavía mandan gente a
morir afuera.

Vos sos un **vigilante**: alguien a quien la ciudad le paga para que salga cuando nadie más
quiere salir.

---

## La zona central: Black Oak City

**No es una sala de spawn. Es una ciudad que tiene que sentirse habitada.**

Mapa real de Flare: `black_oak_city` (100×100, tileset grassland, ~7.000 tiles de
colisión ya dibujados: casas, murallas, árboles, empedrado).

### Distritos y qué pasa en cada uno

| Distrito | Función | NPCs (sprites de Flare) |
|---|---|---|
| **Puerta de Roble** (este, spawn 98,50) | Entrada. Primera impresión del juego. Guardias, cartel de misiones, caravana que llega. | `knight`, `peasant_man1` |
| **La Fragua** | Herrería: reparar, mejorar, craftear. Vender/comprar armas y armaduras. | `wandering_trader` |
| **Casa de Gremios** | Fundar/unirse a un gremio. Tablón de contratos. Ranking de gremios. | `guild_man` |
| **El Mercado** | Mercader ambulante (stock que rota cada día real). Duende buhonero (ítems raros, precios abusivos). | `wandering_trader2`, `peddler_goblin` |
| **Obelisco de Retorno** | Punto de resurrección y viaje rápido. Se activa al tocarlo. | `return_obelisk1` |
| **Los Tres Guardianes** | Estatuas de fuego, hielo y viento. Cada una da un buff temporal por una ofrenda de oro. Gancho de lore. | `statue_guardian_fire/ice/wind` |
| **Barrio Bajo** | Aldeanos, chicos, vida cotidiana. Rumores que apuntan a las zonas del día. | `peasant_*` |

### Lo que hace que se sienta viva (esto es lo que importa)

- **Los NPCs caminan.** Rutas de patrulla simples entre puntos del distrito. Una ciudad con
  NPCs clavados es un decorado; una con NPCs que se mueven es un lugar.
- **Ciclo día/noche** (tinte del canvas + luces cálidas en ventanas de noche). Los aldeanos
  se meten adentro; salen los guardias.
- **Rumores.** Los aldeanos dicen frases que *señalan contenido real*: "Dicen que en las
  minas abandonadas hay algo que no es duende." Y esa noche, esa zona tiene un modificador.
- **Otros jugadores visibles** en la ciudad (WebSocket). Ver a otro con armadura completa de
  placas es el mejor anuncio del juego.
- **Ambiente:** hojas cayendo, humo de la fragua, pájaros. Partículas baratas, mucho retorno.

---

## Zonas (todas son mapas reales de Flare, ya convertidos)

Progresión por nivel; cada una con su tileset y su bestiario.

| Zona | Mapa | Nivel | Tileset | Enemigos |
|---|---|---|---|---|
| Granja de Black Oak | `black_oak_farm` | 1–3 | grassland | goblin, goblin_elite |
| Sendero del Río | `river_trail` | 3–5 | grassland | goblin, hobgoblin |
| Campo Salado | `salted_field` | 4–6 | grassland | zombie, cursed_grave |
| Cueva de Duendes | `goblin_cave` | 5–8 | cave | goblin, hobgoblin_archer |
| Cripta Familiar | `family_crypt` | 7–10 | dungeon | skeleton, skeleton_archer |
| Minas Abandonadas | `abandoned_mines` | 9–12 | cave | skeleton, necromancer |
| Cementerio de Lochport | `lochport_cemetery` | 10–13 | dungeon | zombie_dark, skeleton_mage |
| Nido de Hormigas León | `antlion_nest` | 12–15 | cave | antlion, antlion_armored, **antlion queen** |
| Torre del Mago (1–3) | `wizards_tower_1..3` | 14–18 | ruins | necromancer, wyvern, **boss** |
| Laberinto de Hierro | `iron_labyrinth_f1..f3` | 18+ | dungeon | skeleton_knight_boss, minotaur |

**Regla:** las zonas se abren por nivel, no por quest. Frustrar al jugador con llaves es
para juegos con más contenido que este.

---

## Razas (afectan stats, no el sprite base)

| Raza | Bonus | Penalidad | Fantasía |
|---|---|---|---|
| **Humano** | +10% XP | — | Aprende rápido, muere igual. |
| **Elfo** | +30 maná, +3 INT | −10 vida | Sangre arcana, huesos finos. |
| **Enano** | +40 vida, +3 VIT | −10% velocidad | Piel de piedra, paso corto. |
| **Orco** | +25% daño, +4 FUE | −15% maná | Furia. No mucho más. |

*(El sprite base es el mismo — Flare no tiene cuerpos por raza. Diferenciá con paletas y
con equipamiento inicial distinto.)*

---

## Arquetipos de equipamiento

Flare ya trae los sets. **Usalos como líneas de progresión visual:**

```
cloth   →  leather  →  chain  →  plate      (guerrero: def alta, INT nula)
cloth   →  leather  →  mage_*                (mago: 3 variantes de color, INT alta)
cloth   →  leather  →  chain                 (arquero: destreza, a distancia)
```

Armas: `dagger → shortsword → longsword → greatsword → zweihander` (fuerza),
`wand → rod → staff → greatstaff` (int), `shortbow → longbow → greatbow` (destreza).
Escudos: `buckler → iron_buckler → shield → kite_shield`.

**Cada pieza se VE en el personaje.** Ese es el motor de retención: la gente juega para
verse distinta.

---

## Gremios

No son un chat con nombre. Son una estructura con la que el mundo interactúa:

- **Fundar** cuesta 500 oro. Nombre + sigla de 3 letras + estandarte (color elegible).
- **Nivel de gremio** sube con oro donado y misiones de gremio completadas.
- **Ventajas por nivel:** +oro de botín (n1), +defensa a todos (n2), +XP compartida (n3),
  acceso al **Depósito del Gremio** (n4), estandarte visible sobre la cabeza en ciudad (n5).
- **Contratos de gremio:** misiones semanales que requieren aporte de varios miembros
  ("el gremio debe matar 200 no-muertos"). Progreso compartido y visible.
- **Ranking** público en la Casa de Gremios. La competencia es contenido gratis.

---

## Misiones diarias

Tres por día, sorteadas de un pool, reset a medianoche (hora del servidor).

- **Cacería:** matar N de una especie *en una zona específica* (empuja a viajar).
- **Recolección:** juntar N ítems de un tipo.
- **Contrato:** matar a un enemigo **élite** que aparece solo hoy, en una zona rotativa.
- **Ofrenda:** entregar X oro a un Guardián para un buff de facción del día.

Recompensa: XP + oro + **fragmentos de sello**, la moneda para comprar cosméticos y
mejoras en la Fragua. Esto le da razón de ser al login diario sin ser un impuesto.
