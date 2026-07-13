// Nodo de recurso en el mundo: mata de hierbas (herboristería) o veta de cristal (excavación).
// El ícono real del material (icons.png) flota sobre una base procedural teñida por tipo, con
// un brillo suave. Se toca para juntar; al agotarse se apaga y no vuelve a dar hasta recargar
// el mapa. Mismo patrón que GroundItem (VFX proceduales, no assets nuevos).
import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'

const ICON = 32, COLS = 8

export class ResourceNode {
  constructor(iso, tx, ty, def, iconsTex) {
    this.iso = iso
    this.tx = tx
    this.ty = ty
    this.def = def            // { id, name, glow, base:'herb'|'ore', skill }
    this.depleted = false
    this._t = Math.random() * Math.PI * 2

    this.view = new Container()
    this.view.x = iso.toWorldX(tx, ty)
    this.view.y = iso.toWorldY(tx, ty)
    this.view.zIndex = tx + ty

    // Base procedural: montículo de piedra (veta) o matorral (hierba).
    const base = new Graphics()
    if (def.base === 'ore') {
      base.ellipse(0, 2, iso.wHalf * 0.42, iso.hHalf * 0.5).fill({ color: 0x2a2530 })
      base.moveTo(-10, 2).lineTo(-3, -12).lineTo(2, 2).fill({ color: 0x4a4358 })
      base.moveTo(2, 2).lineTo(8, -8).lineTo(13, 2).fill({ color: 0x3b3547 })
    } else {
      base.ellipse(0, 2, iso.wHalf * 0.42, iso.hHalf * 0.5).fill({ color: 0x243218 })
      for (const dx of [-9, 0, 9]) {
        base.moveTo(dx, 3).quadraticCurveTo(dx - 4, -10, dx, -14).quadraticCurveTo(dx + 4, -10, dx, 3).fill({ color: 0x33461f })
      }
    }
    this.view.addChild(base)

    // Brillo del color del material.
    this.glow = new Graphics()
    this.glow.ellipse(0, 0, iso.wHalf * 0.5, iso.hHalf * 0.5).fill({ color: def.glow, alpha: 0.3 })
    this.view.addChild(this.glow)

    // Ícono real del material, flotando.
    const col = def.icon % COLS, row = (def.icon / COLS) | 0
    this.sprite = new Sprite(new Texture({ source: iconsTex.source, frame: new Rectangle(col * ICON, row * ICON, ICON, ICON) }))
    this.sprite.anchor.set(0.5, 1)
    this.sprite.y = -8
    this.sprite.scale.set(0.85)
    this.view.addChild(this.sprite)

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  deplete() {
    this.depleted = true
    this.view.eventMode = 'none'
    this.view.cursor = 'default'
  }

  update(dt) {
    this._t += dt
    if (this.depleted) {
      if (this.view.alpha > 0.25) this.view.alpha = Math.max(0.25, this.view.alpha - dt * 2)
      this.sprite.visible = false
      this.glow.alpha = 0.08
      return
    }
    this.sprite.y = -8 + Math.sin(this._t * 2.4) * 2.5
    this.glow.alpha = 0.24 + 0.12 * (0.5 + 0.5 * Math.sin(this._t * 2.4))
  }

  destroy() { this.view.destroy({ children: true }) }
}
