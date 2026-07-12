# ECONOMY.md — Economía, acciones y progresión de Vigilia

Diseño del sistema económico de Vigilia. Inspirado en el loop de [Kintara](https://kintara.gg/)
(MMO isométrico), pero adaptado a nuestro arte (Flare, CC-BY-SA) y a nuestra ficción
dark-fantasy. **Todo se valida en el servidor** (regla 2 del CLAUDE.md), incluso en
singleplayer, para que el multiplayer no sea una reescritura.

> **Nota sobre P2E / memecoin.** El plan a futuro es conectar una **memecoin** como capa de
> "cash-out", igual que Kintara con $KINS. Este documento diseña **la economía del juego**
> (oro, recursos, marketplace, banco) dejando **un único punto de enganche** —el marketplace—
> donde después se conecta el token. **No** construimos wallet/blockchain/token todavía: es
> una capa aparte, posterior y sensible a regulación. La economía del juego tiene que
> funcionar y sentirse justa **sin** el token; el token es un multiplicador, no la base.

---

## 1. Qué es P2E

**Play-to-earn** = "jugar para ganar". El juego reparte una moneda/activo con valor real
(cambiable a cripto o dinero), así el tiempo jugado se convierte en plata. El loop de
Kintara: jugar → ganar oro/recursos → vender en el marketplace → cambiar a token → retirar.

**La regla de oro del P2E:** vive o muere por el balance **fuentes vs. sumideros**. Si entra
más moneda de la que sale, se infla y el token se va a cero. Todo el diseño está en **dónde
se quema el oro**. Por eso este doc obsesiona con los sumideros.

---

## 2. Las 6 acciones (skills)

Como en Kintara (6 skills, cada una sube por hacerla, cap **nivel 20**), pero definidas para
Vigilia y usando **solo items reales de Flare**. Copiar tala/pesca literal se descartó: no hay
arte en Flare (ni troncos, ni fauna, ni peces) y no encaja con una ciudad sitiada.

| # | Acción | Qué hacés | Assets (reales de Flare) | Análogo Kintara |
|---|---|---|---|---|
| 1 | **Combate** | Matar enemigos afuera | 18 enemigos, powers, armas | Combat |
| 2 | **Excavación** | Picar **vetas de mastite** en cuevas/minas | mastite + rocas (tileset cave) | Mining |
| 3 | **Herboristería** | Juntar Aloe, Hongos, Cristal de Maná en el campo | items crafting + plantas (grassland) | Woodcutting/gathering |
| 4 | **Alquimia** | Botella + reactivos + Mortero → pociones | pociones + reactivos reales | Cooking |
| 5 | **Forja** | Mastite + materiales → equipo | sistema `mastite_weapon/armor/accessory` escalable | Smithing |
| 6 | **Saqueo** | Abrir cofres / desenterrar reliquias raras | chests + relic/book/gem/figurine | Fishing (loot raro) |

Cada acción sube su propio nivel (XP por acción). Ítems y nodos se **gatean por nivel de
skill** además de por nivel de personaje.

**Assets sueltos que faltan** (se traen CC0, ver §7): iconos de recurso crudo (trozo de
mastite, atado de hierbas), highlight de "nodo recolectable".

---

## 3. Economía: fuentes y sumideros

```
FUENTES (faucets)         →   MONEDA/RECURSOS   →   SUMIDEROS (sinks)
──────────────────            ───────────────       ──────────────────────
Combate (loot + oro)      →   Oro               →   Reparar / mejorar (Fragua)
Excavación (mastite)      →   Materiales        →   Forjar equipo (Forja)
Herboristería (reactivos) →   Reactivos         →   Fundar gremio (500 oro)
Misiones diarias          →   Frag. de sello    →   Cofres (loot box, azar)
Vender al Mercader        →                         Ofrendas a los Guardianes (buff del día)
Abrir cofres (Saqueo)     →                         Cosméticos / estandarte de gremio
        │                                                    │
        └──────────── MARKETPLACE (oro ↔ memecoin) ──────────┘   ← enganche del token (futuro)
```

### Monedas
- **Oro** — moneda de juego. Se gana y se gasta libre. La fuente principal es vender loot.
- **Fragmentos de sello** — moneda premium **NO cripto**, solo de misiones diarias. Compra
  cosméticos y mejoras en la Fragua. Le da razón al login diario sin ser un impuesto.
- **Memecoin (futuro)** — capa de cash-out. Entra **solo** en el marketplace (oro ↔ token,
  split tipo 95% jugador / 5% tesoro, como Kintara). No toca el resto del juego.

### Infraestructura
- **Banco** (en el hub) — guardás materiales/oro antes de zonas peligrosas.
- **Tumba al morir** — en zonas de riesgo, al morir soltás lo que llevabas **encima** (no lo
  bancado) en una tumba en el piso. Tensión real + sumidero natural. (De Kintara.)
- **Marketplace** — primero venta a **Mercader NPC** (precio fijo por ítem). P2P entre
  jugadores y swap a memecoin recién con el servidor sólido.

---

## 4. Ítems: características y beneficios

Los **552 ítems** de Flare (`shared/items.json`) **ya traen stats variados** — no inventamos:

- **Defensa/vida:** `hp`, `absorb_min/max`, `hp_regen`, `poise`, `avoidance`
- **Ofensiva:** `dmg_melee/ranged/ment_min/max`, `accuracy`, `crit`
- **Maná:** `mp`, `mp_regen`
- **Resistencias:** `fire`, `ice`, `lightning`, `dark`
- **Utilidad (clave para P2E):** `xp_gain`, `currency_find` (+oro), `item_find` (+loot)
- **4 rarezas:** común (238) · fino (117) · legendario (120) · único (77)

Los 3 stats de utilidad son el gancho económico: un ítem con `currency_find`/`item_find` te
hace ganar más → tiene **valor de mercado real**. Ya está en los datos.

**Presupuesto por rareza** (cuántos/qué tan altos los bonus): común 1 stat chico → único
varios stats altos + un efecto. La rareza define el color de borde y el brillo del loot.

---

## 5. Loot: cómo se encuentran los ítems

Flare **ya trae tablas de loot por nivel** (`loot/chest_level_1..16.txt`) y **cofres como
objetos**. Reusamos eso.

1. **Tabla de loot por zona.** Cada zona (§6) tiene rango de nivel → filtramos ítems por tier
   + tirada de rareza. Incluye `level_X_unique` y los sets (Warlord/Sniper/Archwizard).
2. **Drop = entidad en el suelo.** Enemigo muere → servidor tira la tabla → aparece el ítem
   en el piso: ícono + brillo del color de rareza (`RARITY_COLOR` + `ParticleField`) + sfx
   `flying_loot.ogg`.
3. **Recoger.** Caminás encima / tocás → pedido al servidor → valida → entra al inventario.
4. **Cofres.** El JSON de cada mapa **ya trae `chests`** → abrir → tirada → loot. Más los
   **Chests comprables** (loot box con oro, sumidero + azar).
5. **Tumba.** Al morir en zona de riesgo, tumba con lo que llevabas encima.

Esto es la **Fase 4** del PLAN (loot en el suelo) + base de la Fase 5.

---

## 6. Misiones diarias y mapas

3 por día, de un pool, reset **00:00 UTC** (más simple para un dev solo que "hora del
servidor"). Recompensa: XP + oro + **fragmentos de sello**. Cada daily atada a un mapa real:

| Tipo | Ejemplo | Mapa | Empuja a… |
|---|---|---|---|
| **Cacería** | "Matá 12 duendes" | `goblin_cave` | viajar + combate |
| **Excavación** | "Extraé 8 mastite" | `abandoned_mines` | skill excavación |
| **Herboristería** | "Juntá 10 hongos" | `river_trail` / `black_oak_farm` | skill hierbas |
| **Contrato** | "Matá al élite del día" (spawnea solo hoy) | zona rotativa | combate duro |
| **Ofrenda** | "Entregá 200 oro a un Guardián" | `lochport` (hub) | sumidero de oro |
| **Saqueo** | "Abrí 3 cofres" | cualquier dungeon | exploración |

**Pool global colaborativo** (de Kintara): objetivo de comunidad/gremio ("el gremio mata 200
no-muertos"), progreso compartido y visible. Encaja con los gremios de WORLD.md.

### Mapas a incluir (ya convertibles, 6 tilesets = 6 biomas)
`lochport` (hub) · `black_oak_farm` (grassland) · `river_trail` (grassland) ·
`goblin_cave` (cave) · `family_crypt` (dungeon) · `abandoned_mines` (cave) ·
`lochport_cemetery` (dungeon). Los **2 portales** del hub: Oeste → `black_oak_farm`
(gathering tranquilo), Este → `goblin_cave` (peligro + tumba).

---

## 7. Assets sueltos

**Sí se pueden agregar.**
- **Técnico:** un PNG en `public/assets/…` lo usa Pixi directo, sin pasar por el pipeline de
  Flare (ese es solo para el bulk). Trivial.
- **Qué falta suelto:** iconos de recurso (trozo de mastite, atado de hierbas, frasco),
  highlight de nodo recolectable.
- **Legal:** solo **CC0 / CC-BY / CC-BY-SA** (OpenGameArt, Kenney CC0). **Nunca** Diablo /
  Tibia / Ultima / Argentum Online ni nada propietario. Mezcla con Flare → el combo se trata
  como CC-BY-SA. Atribución en `CREDITS.md`.

---

## 8. Orden de construcción (un sistema a la vez)

1. **Loot en el suelo + cofres** — el corazón del loop. No necesita assets sueltos ni token.
2. **Banco + Mercader (venta)** — cierra el loop del oro (fuente + primer sumidero).
3. **Recursos + nodos + skills de gathering** — Excavación/Herboristería (aquí entran los
   assets sueltos).
4. **Forja + Alquimia** — convertir materiales en equipo/pociones (sumideros + progresión).
5. **Misiones diarias** — persistidas, reset 00:00 UTC (Fase 6).
6. **Marketplace P2P + enganche de memecoin** — recién con servidor autoritativo sólido.

No se pasa al siguiente sin que el anterior esté **terminado de punta a punta** (regla 4).
