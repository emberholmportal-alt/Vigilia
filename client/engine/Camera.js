// Cámara que sigue al jugador con lerp. Trabaja en pixel de mundo (post-iso).
// El contenedor del mundo se posiciona en (viewW/2 - camX, viewH/2 - camY).

export class Camera {
  constructor(iso, mapW, mapH) {
    this.iso = iso
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

  update(dtFrames) {
    // lerp independiente del framerate (dtFrames = 1 a 60fps)
    const k = 1 - Math.pow(1 - this.lerp, dtFrames)
    this.x += (this.targetX - this.x) * k
    this.y += (this.targetY - this.y) * k
    this._clamp()
  }

  _clamp() {
    // No mostrar el vacío más allá del mapa cuando el mapa entra en pantalla.
    const halfW = this.viewW / 2
    const halfH = this.viewH / 2
    if (this.maxX - this.minX > this.viewW) {
      this.x = Math.max(this.minX + halfW, Math.min(this.maxX - halfW, this.x))
    } else {
      this.x = (this.minX + this.maxX) / 2
    }
    if (this.maxY - this.minY > this.viewH) {
      this.y = Math.max(this.minY + halfH, Math.min(this.maxY - halfH, this.y))
    } else {
      this.y = (this.minY + this.maxY) / 2
    }
  }

  // Offset del contenedor del mundo.
  get offsetX() { return Math.round(this.viewW / 2 - this.x) }
  get offsetY() { return Math.round(this.viewH / 2 - this.y) }

  // pixel de pantalla -> pixel de mundo
  screenToWorld(sx, sy) {
    return { x: sx - this.offsetX, y: sy - this.offsetY }
  }
}
