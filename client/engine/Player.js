// Jugador: paperdoll real de Flare + movimiento por A*.
//
// El movimiento se hace en ESPACIO DE PANTALLA (pixeles de mundo), no en tiles: así
// la velocidad visual es constante en todas las direcciones (moverse en tiles hace que
// la proyección iso acelere/frene según la dirección, y se siente tosco). La animación
// de correr se sincroniza con la velocidad para que los pies no patinen.
//
// Caminar vs correr con stamina lo maneja Game (lee el store); acá recibimos la
// velocidad efectiva por frame.

import { Container, Graphics, Text } from 'pixi.js'
import { findPath, smoothPath } from './Pathfinding.js'
import { Paperdoll, screenVecToDir } from './Paperdoll.js'

export const WALK_PX = 170 // px de pantalla por segundo
export const RUN_PX = 340
const ANIM_REF_PX = 180    // a esta velocidad la anim de correr va a ritmo nativo

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

    const headY = -(this.paperdoll.anchorY + 6) // arriba de la cabeza

    // Nombre flotante sobre la cabeza.
    this.nameText = new Text({
      text: '',
      style: {
        fontFamily: 'Georgia, serif', fontSize: 13, fill: '#e6dcc6',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.nameText.anchor.set(0.5, 1)
    this.nameText.y = headY
    this.view.addChild(this.nameText)

    // Globo de diálogo (encima del nombre), oculto por defecto.
    this.bubble = new Container()
    this.bubbleBg = new Graphics()
    this.bubbleText = new Text({
      text: '',
      style: {
        fontFamily: 'Georgia, serif', fontSize: 13, fill: '#f2ead6',
        stroke: { color: '#0a090c', width: 3 }, align: 'center', wordWrap: false,
      },
    })
    this.bubbleText.anchor.set(0.5, 1)
    this.bubble.addChild(this.bubbleBg, this.bubbleText)
    this.bubble.visible = false
    this.bubble.y = headY - 18
    this.view.addChild(this.bubble)
    this._bubbleText = ''
  }

  setName(name, level, race, lvLabel = 'Nv', guildTag = null) {
    const parts = [(guildTag ? `[${guildTag}] ` : '') + (name || '')]
    if (race) parts.push(race)
    if (level) parts.push(lvLabel + ' ' + level)
    this.nameText.text = parts.join(' · ')
  }

  showBubble(text) {
    if (text === this._bubbleText && this.bubble.visible) return
    this._bubbleText = text
    this.bubbleText.text = text
    // Ancho estimado por caracteres (las métricas de Pixi sub-miden con esta fuente).
    const b = this.bubbleText.getLocalBounds()
    const w = Math.ceil(b.width) + 24
    const h = Math.ceil(b.height) + 12
    this.bubbleBg.clear()
    this.bubbleBg.roundRect(-w / 2, -h, w, h, 6)
      .fill({ color: 0x14111a, alpha: 0.92 })
      .stroke({ color: 0x3b3145, width: 1 })
    this.bubbleText.y = -6
    this.bubble.visible = true
  }

  hideBubble() {
    if (!this.bubble.visible) return
    this.bubble.visible = false
    this._bubbleText = ''
  }

  setRace(app) { this.paperdoll.setRace(app) }
  setBody(body) { this.paperdoll.setBody(body) }

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

  // Mira hacia un tile (para encarar al enemigo antes de pegar).
  faceTile(tx, ty) {
    const w = this.iso.toWorld(this.tx, this.ty)
    const t = this.iso.toWorld(tx, ty)
    this.dir = screenVecToDir(t.x - w.x, t.y - w.y)
    this.paperdoll.setDirection(this.dir)
  }

  // anim de ataque: 'swing' (cuerpo a cuerpo), 'shoot' (arco) o 'cast' (magia). Devuelve ms.
  attack(anim = 'swing') { return this.paperdoll.playOnce(anim) }
  hurt() { this.paperdoll.playOnce('hit') }
  playDie() { this.paperdoll.playOnce('die', true) }
}
