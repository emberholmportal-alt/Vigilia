// Proyectil de combate a distancia: una flecha o un orbe mágico que viaja en línea recta
// desde el que dispara hasta el punto objetivo (en coordenadas de mundo). Al llegar, aplica
// su callback de impacto. El gráfico es procedural (como las barras de vida y los números
// flotantes), no un asset de Flare: es un VFX de juego, barato para el móvil.

import { Container, Graphics } from 'pixi.js'

export class Projectile {
  constructor({ x0, y0, x1, y1, speed = 520, kind = 'arrow', onHit }) {
    const dx = x1 - x0, dy = y1 - y0
    this.dist = Math.hypot(dx, dy) || 1
    this.vx = dx / this.dist
    this.vy = dy / this.dist
    this.speed = speed
    this.travelled = 0
    this.onHit = onHit
    this.dead = false

    this.view = new Container()
    this.view.x = x0
    this.view.y = y0
    this.view.zIndex = 3e6            // siempre por encima del mundo
    this.view.rotation = Math.atan2(dy, dx)
    this._draw(kind)
  }

  _draw(kind) {
    const g = new Graphics()
    if (kind === 'magic') {
      g.circle(0, 0, 7).fill({ color: 0xb060ff, alpha: 0.3 })
      g.circle(0, 0, 4).fill({ color: 0xe6c2ff })
      g.circle(-2, 0, 2).fill({ color: 0xf6ecff })
    } else if (kind === 'fire') {
      g.circle(0, 0, 8).fill({ color: 0xff7a2a, alpha: 0.28 })
      g.circle(0, 0, 4).fill({ color: 0xffd08a })
    } else { // arrow: apunta hacia +x (la rotación la orienta al blanco)
      g.moveTo(-10, 0).lineTo(5, 0).stroke({ color: 0x241a12, width: 2.4 })
      g.poly([9, 0, 3, -2.6, 3, 2.6]).fill(0xe8dcc0)              // punta
      g.moveTo(-10, -2.8).lineTo(-6, 0).lineTo(-10, 2.8).stroke({ color: 0x8a4f28, width: 1.4 }) // plumas
    }
    this.view.addChild(g)
  }

  update(dt) {
    const step = this.speed * dt
    this.travelled += step
    this.view.x += this.vx * step
    this.view.y += this.vy * step
    if (this.travelled >= this.dist) {
      this.dead = true
      if (this.onHit) this.onHit()
    }
  }
}
