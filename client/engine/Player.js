// Jugador: paperdoll real de Flare + movimiento por A*.
//
// El movimiento se hace en ESPACIO DE PANTALLA (pixeles de mundo), no en tiles: así
// la velocidad visual es constante en todas las direcciones (moverse en tiles hace que
// la proyección iso acelere/frene según la dirección, y se siente tosco). La animación
// de correr se sincroniza con la velocidad para que los pies no patinen.
//
// Caminar vs correr con stamina lo maneja Game (lee el store); acá recibimos la
// velocidad efectiva por frame.

import { Container } from 'pixi.js'
import { findPath, smoothPath } from './Pathfinding.js'
import { Paperdoll, screenVecToDir } from './Paperdoll.js'

export const WALK_PX = 105 // px de pantalla por segundo
export const RUN_PX = 185
const ANIM_REF_PX = 150    // a esta velocidad la anim de correr va a ritmo nativo

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
    const raw = findPath(this.grid, Math.round(this.tx), Math.round(this.ty), tx, ty)
    // String-pulling: el camino queda con tramos largos y diagonales, no zigzag de grilla.
    const path = smoothPath(this.grid, raw, this.tx, this.ty)
    if (path.length) {
      this.path = path
      this.moving = true
      this.dest = path[path.length - 1]
    }
    return path
  }

  stop() {
    this.path = []
    this.moving = false
  }

  // dt en segundos. speedPx = velocidad de pantalla efectiva (walk o run).
  update(dt, speedPx = WALK_PX) {
    let vx = 0, vy = 0
    if (this.moving && this.path.length) {
      const target = this.path[0]
      // trabajamos en pixel de mundo para velocidad de pantalla constante
      const wx = this.iso.toWorldX(this.tx, this.ty)
      const wy = this.iso.toWorldY(this.tx, this.ty)
      const twx = this.iso.toWorldX(target.x, target.y)
      const twy = this.iso.toWorldY(target.x, target.y)
      const dxp = twx - wx, dyp = twy - wy
      const distp = Math.hypot(dxp, dyp)
      const step = speedPx * dt
      vx = dxp; vy = dyp
      if (distp <= step || distp === 0) {
        this.tx = target.x
        this.ty = target.y
        this.path.shift()
        if (!this.path.length) this.moving = false
      } else {
        const nx = wx + (dxp / distp) * step
        const ny = wy + (dyp / distp) * step
        const t = this.iso.toTile(nx, ny)
        this.tx = t.x
        this.ty = t.y
      }
    }

    if (vx !== 0 || vy !== 0) this.dir = screenVecToDir(vx, vy)
    this.paperdoll.setDirection(this.dir)
    this.paperdoll.setMoving(this.moving)
    // sincronizar la cadencia de la anim con la velocidad real (anti-patinaje)
    const animFactor = this.moving ? Math.max(0.5, speedPx / ANIM_REF_PX) : 1
    this.paperdoll.update(dt, animFactor)

    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty + 0.5
  }
}
