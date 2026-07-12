// Carga de datos y texturas. Todo sale de public/ (servido estático por Vite).
import { Assets, Rectangle, Texture } from 'pixi.js'

const BASE = import.meta.env.BASE_URL || '/'

export async function loadJSON(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`No pude cargar ${path}: ${res.status}`)
  return res.json()
}

// Carga assets.json (metadata de Flare) y un mapa. Prepara los sub-rects del
// tileset como texturas de Pixi listas para dibujar.
export async function loadWorld(mapName) {
  const [manifest, map] = await Promise.all([
    loadJSON('assets/assets.json'),
    loadJSON(`maps/${mapName}.json`),
  ])

  const tsName = map.tileset
  const tsDef = manifest.tilesets[tsName]
  if (!tsDef) throw new Error(`Falta el tileset ${tsName} en assets.json`)

  const baseTex = await Assets.load(BASE + 'assets/' + tsDef.src)
  // Vecino más cercano se ve peor al escalar iso; dejamos el default (linear).

  // id de tile -> { texture, ox, oy, w, h }
  const tiles = {}
  for (const [id, r] of Object.entries(tsDef.tiles)) {
    const [x, y, w, h, ox, oy] = r
    tiles[id] = {
      texture: new Texture({ source: baseTex.source, frame: new Rectangle(x, y, w, h) }),
      ox, oy, w, h,
    }
  }

  return { manifest, map, tileset: { name: tsName, tiles, scale: manifest.scale, atlasSrc: BASE + 'assets/' + tsDef.src } }
}
