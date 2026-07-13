// Ítem en el suelo (loot). Ícono real de icons.png flotando sobre un brillo del color
// de su rareza, con un bob suave. Se toca o se recoge al caminarle encima.
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'

const BASE = import.meta.env.BASE_URL || '/'
const ICON = 32, COLS = 8

let _iconsTex = null
export async function loadIcons() {
  if (!_iconsTex) _iconsTex = await Assets.load(BASE + 'assets/icons.png')
  return _iconsTex
}
export function iconsTexture() { return _iconsTex }

// '#rrggbb' -> 0xrrggbb
function hex(c) { return parseInt(String(c).replace('#', ''), 16) || 0xffffff }

export class GroundItem {
  constructor(iso, tx, ty, item, qty, rarityColor) {
    this.iso = iso
    this.tx = tx
    this.ty = ty
    this.item = item
    this.qty = qty || 1
    this.tint = hex(rarityColor)
    this._t = Math.random() * Math.PI * 2 // fase del bob (variada por ítem)
    this.picked = false

    this.view = new Container()
    this.view.x = iso.toWorldX(tx, ty)
    this.view.y = iso.toWorldY(tx, ty)
    this.view.zIndex = tx + ty

    // brillo en el piso (elipse del color de rareza)
    this.glow = new Graphics()
    this.glow.ellipse(0, 0, iso.wHalf * 0.5, iso.hHalf * 0.5)
      .fill({ color: this.tint, alpha: 0.35 })
    this.view.addChild(this.glow)

    // ícono flotante
    const tex = _iconsTex
    const col = item.icon % COLS, row = (item.icon / COLS) | 0
    this.sprite = new Sprite(new Texture({
      source: tex.source, frame: new Rectangle(col * ICON, row * ICON, ICON, ICON),
    }))
    this.sprite.anchor.set(0.5, 1)
    this.sprite.y = -6
    this.view.addChild(this.sprite)

    if (this.qty > 1) {
      this.count = new Text({
        text: 'x' + this.qty, style: {
          fontFamily: 'Georgia, serif', fontSize: 11, fill: '#f2ead6',
          stroke: { color: '#0a090c', width: 3 },
        },
      })
      this.count.anchor.set(0.5, 0)
      this.count.y = -4
      this.view.addChild(this.count)
    }

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  update(dt) {
    this._t += dt
    this.sprite.y = -6 + Math.sin(this._t * 3) * 3      // bob
    this.glow.alpha = 0.28 + 0.12 * (0.5 + 0.5 * Math.sin(this._t * 3))
  }

  destroy() { this.view.destroy({ children: true }) }
}
