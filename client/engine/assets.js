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

  // id de tile -> { texture, ox, oy, w, h, frames?, durs?, total? }
  const tiles = {}
  for (const [id, r] of Object.entries(tsDef.tiles)) {
    const [x, y, w, h, ox, oy] = r
    tiles[id] = {
      texture: new Texture({ source: baseTex.source, frame: new Rectangle(x, y, w, h) }),
      ox, oy, w, h,
    }
  }
  // Tiles animados (agua, lava, cascadas…): construimos las texturas de cada frame y el
  // tiempo total del ciclo. El renderer las intercambia en el tiempo (ver MapRenderer.tickAnim).
  const anim = tsDef.anim || {}
  for (const [id, a] of Object.entries(anim)) {
    const t = tiles[id]
    if (!t) continue
    t.frames = a.frames.map(([x, y, w, h]) => new Texture({ source: baseTex.source, frame: new Rectangle(x, y, w, h) }))
    t.durs = a.durs
    // límites acumulados (ms) para ubicar el frame según el reloj; total = fin del ciclo.
    let acc = 0
    t.cum = a.durs.map((d) => (acc += d))
    t.total = acc
  }
  // Tiles de agua: fracción de agua del tile (0..1). El renderer le pinta un shimmer diagonal
  // cuya intensidad va con esa fracción (agua abierta ondula, orilla rocosa casi nada).
  const water = tsDef.water || {}
  for (const [id, frac] of Object.entries(water)) {
    if (tiles[id]) tiles[id].water = frac
  }

  return { manifest, map, tileset: { name: tsName, tiles, scale: manifest.scale, atlasSrc: BASE + 'assets/' + tsDef.src } }
}
