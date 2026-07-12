# Vigilia

MMORPG 2D isométrico de navegador, dark fantasy. Cliente Vite + React (HUD) + Pixi.js v8
(canvas del juego). Arte de [Flare — Empyrean Campaign](https://github.com/flareteam/flare-game)
bajo CC-BY-SA 3.0 (ver [CREDITS.md](CREDITS.md)).

Ver [`CLAUDE.md`](CLAUDE.md) para las reglas del proyecto, [`docs/PLAN.md`](docs/PLAN.md)
para las fases y [`docs/WORLD.md`](docs/WORLD.md) para el diseño del mundo.

## Estado

- **Fase 0 — Pipeline y andamiaje:** ✅ assets y mapas extraídos, Vite + React + Pixi montados.
- **Fase 1 — Renderer isométrico:** ✅ Black Oak City recorrible con culling, cámara con
  lerp, depth-sort por `x+y` y pathfinding A* sobre la grilla de colisión.
- **Fase 2 — Paperdoll:** ✅ héroe compuesto desde las capas de Flare, 8 direcciones,
  animación `stance`/`run`, orden de capas por dirección (`hero_layers`). Spawn en el
  centro de la ciudad + selección de raza (modificadores de WORLD.md).
- **Fase 4 (parcial) — Ítems e inventario:** ✅ los 552 ítems reales parseados a
  `shared/items.json` (nombres en español, slot, ícono, tier, stats, rareza, capa de
  paperdoll). Inventario estilo Diablo: muñeco con slots alrededor de un **retrato real
  del héroe**, grilla de 30 + 9 de equipo + oro, rareza por color, comparación de stats y
  **equipar cambia el aspecto al instante**. Falta: loot en el suelo y validación en
  servidor (llega con las fases de combate/servidor).

### Prueba jugable actual

- Hub: la **explanada abierta de Black Oak Farm** (menos laberinto, mejor para muchos
  jugadores). Probar otras zonas con `?map=<nombre>`.
- **Ciudad viva:** NPCs reales de Flare (guardia, gremio, mercader, buhonero, aldeanos)
  con nombre sobre la cabeza y diálogo con personalidad al tocarlos; varios **patrullan**
  entre puntos. Monumento central: **Obelisco de Retorno + los Tres Guardianes** (estatuas
  de fuego/hielo/viento). Datos en `client/data/npcs.js`.
- **Edificios** en el mapa abierto: se **estampan** cabañas (tiles reales de Black Oak
  City, mismo tileset) en la capa de objeto/colisión antes de renderizar
  (`client/data/structures.js`).
- Nombre del jugador **sobre la cabeza** (se elige en la pantalla de raza) y **globo de
  diálogo** con el botón de chat.
- **Minimapa** (marco de Flare) con la silueta iso de la ciudad y el punto del jugador.
- HUD permanente con arte de Flare: barras de vida/maná, stats siempre a la vista,
  **cinturón de 4 consumibles**, y **caminar/correr con barra de stamina**.
- Inventario en **modal compacto** con los marcos de slot de Flare (muñeco de equipo +
  grilla), sin retrato.
- Movimiento con click/tap: **velocidad constante en pantalla** (la proyección iso ya no
  lo acelera/frena según la dirección) con la animación de correr sincronizada; camino A*
  **suavizado** (string-pulling) y una **X** marca el destino.
- Arte de UI de Flare en `public/assets/ui/` (marcos de slot, barras, minimapa, botones);
  se copia con `python3 tools/extract_flare.py --ui-only`.

## Setup

Requisitos: Node ≥ 18, Python 3 con Pillow (`pip install Pillow`).

```bash
# 1. Dependencias del cliente
npm install

# 2. Arte de Flare (2,2 GB, gitignored — NO se commitea)
git clone --depth 1 https://github.com/flareteam/flare-game.git vendor/flare-game

# 3. Pipeline de assets -> public/ (esto SÍ se commitea)
python3 tools/extract_flare.py --flare vendor/flare-game --out public/assets --scale 0.5
python3 tools/convert_maps.py  --flare vendor/flare-game --out public/maps  --all
```

`public/assets/assets.json` queda con el metadata de sprites/tilesets (atlas repaquetados a
grilla uniforme). `public/maps/<mapa>.json` trae las capas `background` / `object` /
`collision`, portales, cofres, NPCs y spawners.

## Desarrollo

```bash
npm run dev       # http://localhost:5173
npm run build     # build de producción -> dist/
npm run preview   # sirve el build
```

## Verificación (Fase 1)

Smoke test headless: renderiza la ciudad, camina una ruta A* larga y comprueba que el
jugador **nunca** queda dentro de una pared.

```bash
npm run dev &                 # dev server en :5173
node tools/smoke_test.mjs      # Fase 1: camina la ciudad, "SMOKE OK"
node tools/char_test.mjs       # Fase 2/4: raza, paperdoll, equipar, "CHAR OK"
```

Deja un screenshot en `$SHOT_DIR` (temp del SO por defecto). Variables: `CHROME_PATH`,
`SMOKE_URL`, `SHOT_DIR`.

## Estructura

```
client/engine/   Pixi: iso, cámara, renderer con culling, A*, paperdoll, player, loop
client/ui/       React: inicio, selección de raza, HUD, inventario/equipo
client/data/     ítems y razas (kits iniciales con ítems reales)
shared/          items.json (552 ítems de Flare, generado por convert_items.py)
public/assets/   spritesheets + assets.json   (commiteado)
public/maps/     mapas JSON                    (commiteado)
tools/           extract_flare.py, convert_maps.py, convert_items.py, *_test.mjs
```
