// Estructuras estampables: tiles de objeto + colisión extraídos de mapas de Flare
// (mismo tileset) para colocar edificios en un mapa abierto. Se inyectan en las capas
// del mapa ANTES de crear el renderer, así se dibujan y colisionan como cualquier tile.
//
// CABIN: una cabaña de troncos de Black Oak City (tileset grassland).

const CABIN = {
  w: 8, h: 8,
  obj: [
    [5, 0, 70], [6, 0, 67], [4, 1, 66], [5, 1, 58], [6, 1, 48], [2, 2, 66], [3, 2, 51],
    [4, 2, 58], [6, 2, 48], [1, 3, 66], [2, 3, 58], [6, 3, 52], [0, 4, 51], [1, 4, 62],
    [3, 4, 60], [4, 4, 53], [5, 4, 49], [6, 4, 64], [3, 5, 52], [6, 5, 215], [7, 5, 251],
    [0, 6, 53], [1, 6, 53], [2, 6, 49], [3, 6, 64], [4, 6, 212], [5, 6, 213], [6, 6, 214],
    [1, 7, 255],
  ],
  col: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [0, 1], [1, 1], [2, 1], [3, 1],
    [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [0, 3],
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
    [5, 4], [6, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [0, 6],
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [1, 7],
  ],
}

// Dónde colocar estructuras por mapa. (x,y) = esquina superior del footprint.
export const STRUCTURES = {
  black_oak_farm: [
    { struct: CABIN, x: 44, y: 40 },
    { struct: CABIN, x: 63, y: 40 },
    { struct: CABIN, x: 44, y: 58 },
  ],
}

// Inyecta las estructuras del mapa en sus capas de objeto y colisión (mutación).
export function stampStructures(map, mapName) {
  const list = STRUCTURES[mapName]
  if (!list) return
  const obj = map.layers.object, col = map.layers.collision
  for (const { struct, x, y } of list) {
    for (const [dx, dy, id] of struct.obj) {
      const ty = y + dy, tx = x + dx
      if (obj[ty] && tx >= 0 && tx < map.w) obj[ty][tx] = id
    }
    for (const [dx, dy] of struct.col) {
      const ty = y + dy, tx = x + dx
      if (col[ty] && tx >= 0 && tx < map.w) col[ty][tx] = 1
    }
  }
}
