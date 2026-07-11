// Jugador: paperdoll real de Flare + movimiento por A*.
//
// La posición es tile fraccional; se mueve waypoint a waypoint sobre el camino A*.
// La dirección (8) sale del vector de movimiento en espacio de PANTALLA. El aspecto
// (paperdoll) cambia al equiparse: ver setEquipment.
//
// Nota de arquitectura: cuando llegue el servidor autoritativo (regla 2 de CLAUDE.md),
// este módulo pide moverse/equipar y aplica lo que confirma el server. Por ahora el
// movimiento y el equipo se resuelven en el cliente, pero viven en un solo lugar.

import { Container } from 'pixi.js'
import { findPath } from './Pathfinding.js'
import { Paperdoll, screenVecToDir } from './Paperdoll.js'

const SPEED = 3.2 // tiles por segundo

export class Player {
  constructor(iso, grid, manifest, tx, ty) {
    this.iso = iso
    this.grid = grid
    this.tx = tx
    this.ty = ty
    this.path = []
    this.moving = false
    this.dir = 7 // sur

    this.view = new Container()
    this.paperdoll = new Paperdoll(manifest)
    this.view.addChild(this.paperdoll.view)
  }

  async setEquipment(equip) {
    await this.paperdoll.setEquipment(equip)
  }

  walkTo(tx, ty) {
    const path = findPath(this.grid, Math.round(this.tx), Math.round(this.ty), tx, ty)
    if (path.length) {
      this.path = path
      this.moving = true
    }
    return path
  }

  update(dt) {
    let vx = 0, vy = 0
    if (this.moving && this.path.length) {
      const target = this.path[0]
      const dx = target.x - this.tx
      const dy = target.y - this.ty
      const dist = Math.hypot(dx, dy)
      const step = SPEED * dt
      // dirección en espacio de pantalla (proyección iso del vector de movimiento)
      vx = this.iso.toWorldX(dx, dy)
      vy = this.iso.toWorldY(dx, dy)
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

    if (vx !== 0 || vy !== 0) this.dir = screenVecToDir(vx, vy)
    this.paperdoll.setDirection(this.dir)
    this.paperdoll.setMoving(this.moving)
    this.paperdoll.update(dt)

    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty + 0.5
  }
}
