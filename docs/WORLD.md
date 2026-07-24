# WORLD.md — El mundo de Vigilia

## Premisa

Empyrea cayó. Los muertos no descansan, los duendes bajaron de las minas y algo antiguo
respira en el Laberinto de Hierro. **Triston** es lo último que queda en pie: la última
ciudad con murallas, con fragua encendida y con gremios que todavía mandan gente a morir
afuera. (**Black Oak City**, mucho más grande, queda como zona de nivel alto y futuro gran
hub cuando el mundo crezca; ver ESCENARIOS.md.)

Vos sos un **vigilante**: alguien a quien la ciudad le paga para que salga cuando nadie más
quiere salir.

---

## El hub: Triston

**No es una sala de spawn. Es una ciudad que tiene que sentirse habitada.**

Triston usa arte propio (HERESY, escala de pueblo amurallado). Es el único mapa **seguro**
(sin combate) y el nexo de todo: de acá salen las 6 ramas del mundo, y acá viven las estaciones.

### Estaciones y qué pasa en cada una

| Estación | Función | Notas |
|---|---|---|
| **La Fragua** | Forja: craftear/mejorar equipo con mastite. | Estación (panel UI). |
| **Mesa de Alquimia** | Pociones con reactivos. | Estación (panel UI). |
| **El Mercado** | Mercader (stock que rota) + subastas en oro + oro↔$VEL (no-custodial). | Puesto del carro. |
| **Casa de Gremios** | Fundar/unirse, contratos, depósito, ranking. | Estación (panel UI). |
| **Obelisco de Retorno** | Resurrección + viaje rápido (waypoints) + ofrendas de oro. | Landmark, se activa al tocarlo. |
| **Los Tres Guardianes** | Estatuas de fuego, hielo y viento. Cierran la quest de los Tres Nombres y dan buff por ofrenda. | Landmark + gancho de lore. |
| **Plaza y aldeanos** | Vida cotidiana. Rumores que apuntan a las zonas del día. | Guardias, videntes, críticos. |

> **Black Oak City** (`black_oak_city`, 100×100 grassland) es la **zona insignia** de nivel alto
> (lv10) y el futuro gran hub cuando el mundo crezca — no el hub actual.

### Lo que hace que se sienta viva (esto es lo que importa)

- **Los NPCs caminan.** Rutas de patrulla simples entre puntos. Una ciudad con NPCs clavados es un
  decorado; una con NPCs que se mueven es un lugar.
- **Ciclo día/noche** (tinte del canvas + luces cálidas en ventanas de noche).
- **Rumores.** Los aldeanos dicen frases que *señalan contenido real* (la zona de la daily). Al
  entrar por primera vez a un realm, una frase de lore lo teje en el momento (ver `zonelore.js`).
- **Otros jugadores visibles** (WebSocket). Ver a otro con armadura completa de placas es el mejor
  anuncio del juego.
- **Ambiente:** hojas, humo de la fragua, pájaros. Partículas baratas, mucho retorno.

---

## Zonas (todas son mapas reales de Flare, ya convertidos)

El mundo curado tiene **40 mapas** conectados en 6 ramas, progresión **nivel 1→17**, con **13 jefes**
permanentes. El mapa completo (cada zona, su nivel, su jefe y cómo se cablea) está en
**`ESCENARIOS.md`** — esa es la fuente de verdad. Un vistazo a las ramas:

| Rama | Nivel | Ejemplos | Clímax |
|---|---|---|---|
| **Oeste** (gathering) | 1–6 | Granja, Sendero del Río, Campo Salado, Greenwood | — |
| **Costero / Lochport** | 2–3 | Lochport, Cementerio, Cripta, Ciénaga de Merrimead | contrato de élite |
| **Este** (combate) | 5–9 | Cueva de Duendes → Cluster Minero (Fuerte Amir) + Templo de Mez | Caballero de hueso / Wyvern |
| **Los Tres Nombres** (ruinas) | 9 | Sta. María, Perdición, Roca-Tormenta | 3 Wyverns elementales |
| **Región de Black Oak** (descenso) | 9–15 | City, Cloacas, Torre del Mago, Nazia, Inframundo, Fortalezas | Caballero de hueso (lv15) |
| **Endgame** (el fondo) | 14–17 | El Oasis, El Pozo | Minotauro del fondo (lv17) |

**Regla:** las zonas se abren por nivel, no por quest. Frustrar al jugador con llaves es
para juegos con más contenido que este. Y el mundo es **hermético**: ningún portal lleva a una
sala sin poblar (ver el sellado de bordes en `ESCENARIOS.md`).

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
  Fundar y gestionar es sólo con Halvard (el NPC); no hay atajo para crear gremios.
- **Rangos:** fundador > oficial > miembro. Fundador y oficiales **invitan** (tocando a un
  jugador cercano) y **expulsan**; el fundador asciende/desciende oficiales y **transfiere** el
  liderazgo. Al salir el fundador, hereda el miembro más antiguo. Chat de gremio propio.
- **Nivel de gremio** sube con oro donado y contratos completados. **Sin tope:** las ventajas
  llegan hasta n5, pero pasado el 5 cada +30k de oro donado suma un nivel de prestigio (sin
  ventaja nueva) que sigue pesando en el ranking.
- **Ventajas por nivel:** +oro de botín (n1), +defensa a todos (n2), +XP compartida (n3),
  acceso al **Depósito del Gremio** (n4), estandarte visible sobre la cabeza en ciudad (n5).
- **Contratos de gremio:** misiones semanales que requieren aporte de varios miembros
  ("el gremio debe matar 200 no-muertos"). Progreso compartido y visible.
- **Ranking** público en la Casa de Gremios y en la hoja de personaje, ordenado por el
  **Poder del gremio** (no sólo oro donado): `Σniveles×10 + promedio×30 + miembros×10 +
  nivelGremio×40 + ⌊donado/500⌋`. Cinco ejes, **todos sin tope**: fuerza (suma de niveles de
  experiencia de los miembros), calidad (promedio de nivel — la señal anti-alt, pesa fuerte),
  tamaño (cantidad de miembros — bonus modesto: Σniveles ya crece con el tamaño), progreso
  institucional (nivel del gremio) y donación al pozo. Todo server-autoritativo. La competencia
  es contenido gratis.

---

## Misiones diarias

Tres por día, sorteadas de un pool, reset a medianoche (hora del servidor).

- **Cacería:** matar N de una especie *en una zona específica* (empuja a viajar).
- **Recolección:** juntar N ítems de un tipo.
- **Contrato:** matar a un enemigo **élite** que aparece solo hoy, en una zona rotativa.
- **Ofrenda:** entregar X oro a un Guardián para un buff de facción del día.

Recompensa: XP + oro + **fragmentos de sello**, la moneda para comprar cosméticos y
mejoras en la Fragua. Esto le da razón de ser al login diario sin ser un impuesto.
