// A* sobre la grilla de colisión de Black Oak City.
//
// La ciudad tiene ~7.000 tiles bloqueados (murallas, casas, árboles): no sirve
// line-of-sight, el jugador se traba. Usamos 8 direcciones pero SIN cortar esquinas:
// una diagonal solo es válida si los dos ortogonales adyacentes están libres.

// Min-heap binario indexado por f-score. Barato y suficiente para 100×100.
class MinHeap {
  constructor() { this.items = [] }
  get size() { return this.items.length }
  push(node) {
    const a = this.items
    a.push(node)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].f <= a[i].f) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.items
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      const n = a.length
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < n && a[l].f < a[m].f) m = l
        if (r < n && a[r].f < a[m].f) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

export class Grid {
  // collision: matriz h×w, 0 = pasable, >0 = bloqueado (regla de Flare).
  constructor(collision, w, h) {
    this.w = w
    this.h = h
    this.blocked = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      const row = collision[y]
      for (let x = 0; x < w; x++) {
        this.blocked[y * w + x] = row[x] > 0 ? 1 : 0
      }
    }
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  isBlocked(x, y) { return !this.inside(x, y) || this.blocked[y * this.w + x] === 1 }
  isWalkable(x, y) { return this.inside(x, y) && this.blocked[y * this.w + x] === 0 }

  // El tile caminable más cercano a (x,y) por radio creciente. Sirve para clics
  // sobre una pared: caminamos hasta el borde en vez de no hacer nada.
  nearestWalkable(x, y, maxR = 6) {
    if (this.isWalkable(x, y)) return { x, y }
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          const nx = x + dx, ny = y + dy
          if (this.isWalkable(nx, ny)) return { x: nx, y: ny }
        }
      }
    }
    return null
  }
}

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]
const SQRT2 = Math.SQRT2

// A* con octile heuristic. Devuelve array de {x,y} (sin el tile de inicio) o [].
export function findPath(grid, sx, sy, tx, ty) {
  sx = Math.round(sx); sy = Math.round(sy); tx = Math.round(tx); ty = Math.round(ty)
  if (!grid.isWalkable(tx, ty)) {
    const near = grid.nearestWalkable(tx, ty)
    if (!near) return []
    tx = near.x; ty = near.y
  }
  if (sx === tx && sy === ty) return []
  if (!grid.isWalkable(sx, sy)) return []

  const w = grid.w, n = grid.w * grid.h
  const gScore = new Float64Array(n).fill(Infinity)
  const cameFrom = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)
  const startIdx = sy * w + sx
  const goalIdx = ty * w + tx

  const h = (x, y) => {
    const dx = Math.abs(x - tx), dy = Math.abs(y - ty)
    return (dx + dy) + (SQRT2 - 2) * Math.min(dx, dy) // octile
  }

  gScore[startIdx] = 0
  const open = new MinHeap()
  open.push({ x: sx, y: sy, idx: startIdx, f: h(sx, sy) })

  while (open.size) {
    const cur = open.pop()
    if (closed[cur.idx]) continue
    if (cur.idx === goalIdx) return reconstruct(cameFrom, goalIdx, w)
    closed[cur.idx] = 1

    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy
      if (!grid.isWalkable(nx, ny)) continue
      // sin cortar esquinas: la diagonal necesita los dos ortogonales libres
      if (dx !== 0 && dy !== 0) {
        if (grid.isBlocked(cur.x + dx, cur.y) || grid.isBlocked(cur.x, cur.y + dy)) continue
      }
      const nIdx = ny * w + nx
      if (closed[nIdx]) continue
      const step = dx !== 0 && dy !== 0 ? SQRT2 : 1
      const tentative = gScore[cur.idx] + step
      if (tentative < gScore[nIdx]) {
        gScore[nIdx] = tentative
        cameFrom[nIdx] = cur.idx
        open.push({ x: nx, y: ny, idx: nIdx, f: tentative + h(nx, ny) })
      }
    }
  }
  return [] // sin camino
}

function reconstruct(cameFrom, goalIdx, w) {
  const path = []
  let idx = goalIdx
  while (idx !== -1) {
    path.push({ x: idx % w, y: (idx / w) | 0 })
    idx = cameFrom[idx]
  }
  path.reverse()
  path.shift() // sacamos el tile de inicio
  return path
}
