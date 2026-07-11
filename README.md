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
node tools/smoke_test.mjs      # imprime métricas y "SMOKE OK"
```

Deja un screenshot en `$SHOT_DIR` (temp del SO por defecto). Variables: `CHROME_PATH`,
`SMOKE_URL`, `SHOT_DIR`.

## Estructura

```
client/engine/   Pixi: iso, cámara, renderer con culling, A*, player, loop
client/ui/       React: HUD, pantalla de inicio (atribución a Flare)
public/assets/   spritesheets + assets.json   (commiteado)
public/maps/     mapas JSON                    (commiteado)
tools/           extract_flare.py, convert_maps.py, smoke_test.mjs
```
