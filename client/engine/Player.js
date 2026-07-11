// Jugador de la Fase 1.
//
// OJO: el paperdoll es Fase 2. Acá el héroe es un marcador simple (un rombo con
// sombra) para poder VER el movimiento, el pathfinding y el depth-sort funcionando.
// La posición es tile fraccional; se mueve waypoint a waypoint sobre el camino A*.
//
// Nota de arquitectura: cuando llegue el servidor autoritativo (regla 2 de CLAUDE.md),
// este módulo pide moverse y aplica la posición que confirma el server. Por ahora
// integra el movimiento local, pero la posición vive en un solo lugar (tx,ty).

import { Container, Graphics } from 'pixi.js'
import { findPath } from './Pathfinding.js'

const SPEED = 3.2 // tiles por segundo

export class Player {
  constructor(iso, grid, tx, ty) {
    this.iso = iso
    this.grid = grid
    this.tx = tx
    this.ty = ty
    this.path = []       // array de {x,y} pendientes
    this.moving = false

    this.view = new Container()
    const g = new Graphics()
    // sombra
    g.ellipse(0, 0, iso.wHalf * 0.42, iso.hHalf * 0.42).fill({ color: 0x000000, alpha: 0.35 })
    // rombo del vigilante (placeholder hasta el paperdoll)
    const bh = iso.tileH * 0.9
    g.poly([0, -bh, iso.wHalf * 0.5, -bh * 0.55, 0, -bh * 0.1, -iso.wHalf * 0.5, -bh * 0.55])
      .fill({ color: 0xc2551f })
      .stroke({ color: 0x14111a, width: 2 })
    g.circle(0, -bh * 0.92, iso.wHalf * 0.22).fill({ color: 0xd3c6ac })
    this.view.addChild(g)
  }

  // Pide caminar hasta un tile (calcula A* desde la posición actual redondeada).
  walkTo(tx, ty) {
    const path = findPath(this.grid, Math.round(this.tx), Math.round(this.ty), tx, ty)
    if (path.length) {
      this.path = path
      this.moving = true
    }
    return path
  }

  update(dt) {
    if (this.moving && this.path.length) {
      const target = this.path[0]
      const dx = target.x - this.tx
      const dy = target.y - this.ty
      const dist = Math.hypot(dx, dy)
      const step = SPEED * dt
      if (dist <= step || dist === 0) {
        this.tx = target.x
        this.ty = target.y
        this.path.shift()
        if (!this.path.length) this.moving = false
      } else {
        this.tx += (dx / dist) * step
        this.ty += (dy / dist) * step
      }
    }
    // Colocar el sprite en pixel de mundo y depth-sort junto a los objetos.
    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    // +0.5: ante empate de (x+y) con un objeto, el jugador va adelante.
    this.view.zIndex = this.tx + this.ty + 0.5
  }
}
