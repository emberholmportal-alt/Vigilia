// Renderer isométrico de Black Oak City.
//
// - Capa `background`: suelo (diamantes de grassland). Se dibuja primero.
// - Capa `object`: muros, casas, árboles. Depth-sort por (x+y) JUNTO con las
//   entidades (el jugador), así los árboles te tapan cuando pasás por detrás.
// - Culling: solo instanciamos los tiles visibles. Pixi no cullea solo.
//
// Rendimiento: pool de sprites por capa. Solo reconstruimos los tiles cuando la
// cámara cruza un límite de tile (no cada frame). Las entidades se reordenan por
// zIndex cada frame, que es barato con ~pocos cientos de hijos visibles.

import { Container, Sprite } from 'pixi.js'

// Margen extra de tiles alrededor del viewport: los props altos (árboles, torres)
// tienen su base fuera de cámara pero la copa entra. 8 tiles cubre lo más alto.
const CULL_PAD = 8

class SpritePool {
  constructor(parent) {
    this.parent = parent
    this.sprites = []
    this.cursor = 0
  }
  begin() { this.cursor = 0 }
  next() {
    let s = this.sprites[this.cursor]
    if (!s) {
      s = new Sprite()
      s.anchor.set(0, 0)
      this.parent.addChild(s)
      this.sprites[this.cursor] = s
    }
    this.cursor++
    return s
  }
  end() {
    // Ocultamos los sobrantes del pool sin sacarlos del contenedor.
    for (let i = this.cursor; i < this.sprites.length; i++) {
      if (this.sprites[i].visible) this.sprites[i].visible = false
    }
  }
}

export class MapRenderer {
  constructor(iso, map, tileset) {
    this.iso = iso
    this.map = map
    this.tiles = tileset.tiles
    this.w = map.w
    this.h = map.h

    // Aplanamos las matrices a arrays para acceso rápido en el bucle de culling.
    this.bg = flatten(map.layers.background, this.w, this.h)
    this.obj = flatten(map.layers.object, this.w, this.h)

    // Dos contenedores. El de objetos ordena por zIndex (comparte orden con el jugador).
    this.groundLayer = new Container()
    this.groundLayer.sortableChildren = true
    this.objectLayer = new Container()
    this.objectLayer.sortableChildren = true

    this.root = new Container()
    this.root.addChild(this.groundLayer)
    this.root.addChild(this.objectLayer)

    this.groundPool = new SpritePool(this.groundLayer)
    this.objectPool = new SpritePool(this.objectLayer)

    this._anim = []   // { s, t } de los tiles animados visibles (se rehace en cada _rebuild)
    this._last = { x0: 1, y0: 1, x1: 0, y1: 0 } // rect inválido -> primer build forzado
    this.visibleTiles = 0
  }

  // Rango de tiles visibles a partir del rect de mundo que cubre la cámara.
  _visibleRect(cam) {
    const w2 = cam.viewW, h2 = cam.viewH
    // Cuatro esquinas de pantalla -> pixel de mundo -> tile.
    const corners = [
      cam.screenToWorld(0, 0),
      cam.screenToWorld(w2, 0),
      cam.screenToWorld(0, h2),
      cam.screenToWorld(w2, h2),
    ]
    let minTx = Infinity, minTy = Infinity, maxTx = -Infinity, maxTy = -Infinity
    for (const c of corners) {
      const t = this.iso.toTile(c.x, c.y)
      if (t.x < minTx) minTx = t.x
      if (t.y < minTy) minTy = t.y
      if (t.x > maxTx) maxTx = t.x
      if (t.y > maxTy) maxTy = t.y
    }
    return {
      x0: Math.max(0, Math.floor(minTx) - CULL_PAD),
      y0: Math.max(0, Math.floor(minTy) - CULL_PAD),
      x1: Math.min(this.w - 1, Math.ceil(maxTx) + CULL_PAD),
      y1: Math.min(this.h - 1, Math.ceil(maxTy) + CULL_PAD),
    }
  }

  update(cam) {
    const r = this._visibleRect(cam)
    const L = this._last
    if (r.x0 === L.x0 && r.y0 === L.y0 && r.x1 === L.x1 && r.y1 === L.y1) return
    this._last = r
    this._rebuild(r)
  }

  // Recorre los sprites de objeto visibles (los del último rebuild). El jugador/NPCs no
  // están en el pool, así que esto sólo toca tiles del mapa (edificios, árboles, props).
  eachVisibleObject(cb) {
    const pool = this.objectPool
    for (let i = 0; i < pool.cursor; i++) {
      const s = pool.sprites[i]
      if (s && s.visible) cb(s)
    }
  }

  // Ubica el frame de cada tile animado según el reloj (ms). Se llama cada frame, pero sólo
  // toca los pocos tiles animados que están en cámara. Animación real de Flare (agua que fluye,
  // cascadas, lava): nada procedural.
  tickAnim(ms) {
    for (const a of this._anim) {
      const t = a.t
      const ph = ms % t.total
      let i = 0
      while (i < t.cum.length - 1 && ph >= t.cum[i]) i++
      a.s.texture = t.frames[i]
    }
  }

  _rebuild(r) {
    const { groundPool, objectPool, tiles, iso, w } = this
    groundPool.begin()
    objectPool.begin()
    this._anim.length = 0
    let count = 0

    // Iteramos en orden (x+y) creciente para dar un back-to-front natural; igual
    // el zIndex manda, esto solo ayuda a la estabilidad del sort.
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        const i = ty * w + tx
        const wx = iso.toWorldX(tx, ty)
        const wy = iso.toWorldY(tx, ty)
        const depth = tx + ty

        const bgId = this.bg[i]
        if (bgId) {
          const t = tiles[bgId]
          if (t) {
            const s = groundPool.next()
            s.texture = t.texture
            s.x = wx - t.ox
            s.y = wy - t.oy
            s.zIndex = depth
            s.visible = true
            if (t.frames) this._anim.push({ s, t })
            count++
          }
        }
        const objId = this.obj[i]
        if (objId) {
          const t = tiles[objId]
          if (t) {
            const s = objectPool.next()
            s.texture = t.texture
            s.x = wx - t.ox
            s.y = wy - t.oy
            // El objeto se apoya en su tile base: mismo depth que una entidad ahí.
            s.zIndex = depth
            s._ti = i           // índice de tile (para la atenuación por-tile del occlusion)
            s.visible = true
            if (t.frames) this._anim.push({ s, t })
            count++
          }
        }
      }
    }
    groundPool.end()
    objectPool.end()
    this.visibleTiles = count
  }
}

function flatten(matrix, w, h) {
  const out = new Uint16Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = matrix[y]
    for (let x = 0; x < w; x++) out[y * w + x] = row[x] || 0
  }
  return out
}
