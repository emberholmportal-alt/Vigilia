// Matemática isométrica de Vigilia.
//
// Flare dibuja diamantes de tileW × tileH (192×96 originales). El cliente aplica
// `scale` (0.5 en móvil). Convención de map_to_screen de Flare:
//   worldX = (tx - ty) * TILE_W_HALF
//   worldY = (tx + ty) * TILE_H_HALF
// La cámara desplaza el contenedor entero; acá solo proyectamos tile <-> pixel de mundo.

export class Iso {
  constructor(tileW, tileH, scale) {
    this.scale = scale
    this.tileW = tileW * scale
    this.tileH = tileH * scale
    this.wHalf = this.tileW / 2
    this.hHalf = this.tileH / 2
  }

  // tile (puede ser fraccional) -> pixel de mundo
  toWorld(tx, ty) {
    return {
      x: (tx - ty) * this.wHalf,
      y: (tx + ty) * this.hHalf,
    }
  }

  toWorldX(tx, ty) { return (tx - ty) * this.wHalf }
  toWorldY(tx, ty) { return (tx + ty) * this.hHalf }

  // pixel de mundo -> tile fraccional
  toTile(wx, wy) {
    const a = wx / this.wHalf
    const b = wy / this.hHalf
    return {
      x: (a + b) / 2,
      y: (b - a) / 2,
    }
  }
}
