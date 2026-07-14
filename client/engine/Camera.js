// Cámara que sigue al jugador con lerp. Trabaja en pixel de mundo (post-iso).
// El contenedor del mundo se posiciona en (viewW/2 - camX, viewH/2 - camY).

export class Camera {
  constructor(iso, mapW, mapH, zoom = 1) {
    this.iso = iso
    this.zoom = zoom          // acercamiento de la cámara (escala del contenedor del mundo)
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    this.viewW = 0
    this.viewH = 0
    this.lerp = 0.12 // suavidad; más alto = más pegado al jugador

    // Límites del mundo en pixel (las esquinas del diamante 0..w, 0..h).
    const c1 = iso.toWorld(0, 0)
    const c2 = iso.toWorld(mapW, 0)
    const c3 = iso.toWorld(0, mapH)
    const c4 = iso.toWorld(mapW, mapH)
    this.minX = Math.min(c1.x, c2.x, c3.x, c4.x)
    this.maxX = Math.max(c1.x, c2.x, c3.x, c4.x)
    this.minY = Math.min(c1.y, c2.y, c3.y, c4.y)
    this.maxY = Math.max(c1.y, c2.y, c3.y, c4.y)
  }

  resize(w, h) { this.viewW = w; this.viewH = h }

  follow(tx, ty) {
    this.targetX = this.iso.toWorldX(tx, ty)
    this.targetY = this.iso.toWorldY(tx, ty)
  }

  snap() { this.x = this.targetX; this.y = this.targetY; this._clamp() }

  // Pan libre (modo mirón). En pixel de MUNDO: mueve el objetivo (el lerp lo alcanza).
  panWorld(dx, dy) {
    const c = this._clampVal(this.targetX + dx, this.targetY + dy)
    this.targetX = c.x; this.targetY = c.y
  }

  // Pan por arrastre: 1:1 con el dedo/mouse. Arrastrar a la derecha corre el mundo a la derecha
  // (mirás más a la izquierda). Sin lerp: movemos objetivo Y posición juntos.
  panScreen(dxScreen, dyScreen) {
    const dx = dxScreen / this.zoom, dy = dyScreen / this.zoom
    const c = this._clampVal(this.targetX - dx, this.targetY - dy)
    this.targetX = c.x; this.targetY = c.y
    this.x = c.x; this.y = c.y
  }

  update(dtFrames) {
    // lerp independiente del framerate (dtFrames = 1 a 60fps)
    const k = 1 - Math.pow(1 - this.lerp, dtFrames)
    this.x += (this.targetX - this.x) * k
    this.y += (this.targetY - this.y) * k
    this._clamp()
  }

  // Clampa un (x,y) al área visible del mundo (respetando el zoom). Devuelve {x,y}.
  _clampVal(x, y) {
    const halfW = this.viewW / (2 * this.zoom)
    const halfH = this.viewH / (2 * this.zoom)
    const cx = (this.maxX - this.minX > halfW * 2)
      ? Math.max(this.minX + halfW, Math.min(this.maxX - halfW, x))
      : (this.minX + this.maxX) / 2
    const cy = (this.maxY - this.minY > halfH * 2)
      ? Math.max(this.minY + halfH, Math.min(this.maxY - halfH, y))
      : (this.minY + this.maxY) / 2
    return { x: cx, y: cy }
  }

  _clamp() { const c = this._clampVal(this.x, this.y); this.x = c.x; this.y = c.y }

  // Offset del contenedor del mundo (con zoom: screen = world*zoom + offset).
  get offsetX() { return Math.round(this.viewW / 2 - this.x * this.zoom) }
  get offsetY() { return Math.round(this.viewH / 2 - this.y * this.zoom) }

  // pixel de pantalla -> pixel de mundo (deshace el zoom)
  screenToWorld(sx, sy) {
    return { x: (sx - this.offsetX) / this.zoom, y: (sy - this.offsetY) / this.zoom }
  }
}
