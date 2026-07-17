// Ítem en el suelo (loot). Ícono real de icons.png flotando sobre un brillo del color
// de su rareza, con un bob suave. Se toca o se recoge al caminarle encima.
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { itemName, getLang } from '../i18n.js'

const BASE = import.meta.env.BASE_URL || '/'
const ICON = 32, COLS = 8
// Despawn del loot ignorado (Diablo): se desvanece tras un rato para no acumular sprites en el
// suelo (presupuesto de 60fps en móvil). El oro casi siempre se recoge al pasar; esto atrapa lo
// que el jugador deja atrás y nunca vuelve a buscar.
const TTL = 100    // segundos que un loot vive en el suelo
const FADE = 8     // segundos finales en los que se desvanece

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
    this.age = 0            // segundos en el suelo (para el despawn)
    this.expired = false

    this.view = new Container()
    this.view.x = iso.toWorldX(tx, ty)
    this.view.y = iso.toWorldY(tx, ty)
    this.view.zIndex = tx + ty

    // sombra en el piso: el ítem parece apoyado, no flotando.
    this.shadow = new Graphics()
    this.shadow.ellipse(0, 1, iso.wHalf * 0.34, iso.hHalf * 0.34).fill({ color: 0x000000, alpha: 0.35 })
    this.view.addChild(this.shadow)

    // aura tenue del color de rareza (para que se note en el pasto sin parecer un token).
    this.glow = new Graphics()
    this.glow.ellipse(0, 0, iso.wHalf * 0.38, iso.hHalf * 0.34).fill({ color: this.tint, alpha: 0.18 })
    this.view.addChild(this.glow)

    // Oro: pila de monedas apoyada en el piso (Diablo), sin ícono del atlas. Se ve en el suelo.
    if (item.gold) {
      this.isGold = true
      this.gold = item.gold
      const coins = new Graphics()
      for (const [ox, oy, r] of [[-5, 0, 4], [4, 1, 4], [0, -3, 4], [-2, -6, 3], [3, -5, 3], [-1, 3, 3]]) {
        coins.circle(ox, -4 + oy, r).fill({ color: 0xf0d165 })
      }
      coins.stroke({ color: 0x8a6f1e, width: 0.8, alpha: 0.9 })
      this.coins = coins
      this.view.addChild(coins)
    } else {
      // ícono apoyado en el suelo (chico, casi sin flotar) con leve inclinación.
      const tex = _iconsTex
      const col = item.icon % COLS, row = (item.icon / COLS) | 0
      // Wrapper propio, guardado en `_ownTex` para que el teardown del mapa lo libere igual que
      // las demás entidades (el loot que quedó en el suelo al cambiar de mapa, si no, leakeaba).
      this._ownTex = new Texture({ source: tex.source, frame: new Rectangle(col * ICON, row * ICON, ICON, ICON) })
      this.sprite = new Sprite(this._ownTex)
      this.sprite.anchor.set(0.5, 0.9)
      this.sprite.scale.set(0.82)
      this.sprite.rotation = -0.18
      this.sprite.y = -3
      this.view.addChild(this.sprite)
    }

    // etiqueta: nombre del ítem (color de rareza) o "N oro". Como el loot de Diablo. Incluye ×qty.
    const label = item.gold ? (item.gold + ' ' + (getLang() === 'en' ? 'gold' : 'oro'))
      : (itemName(item, getLang()) + (this.qty > 1 ? ' ×' + this.qty : ''))
    this.label = new Text({
      text: label, style: {
        fontFamily: 'Georgia, serif', fontSize: 11, fill: '#' + this.tint.toString(16).padStart(6, '0'),
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.label.anchor.set(0.5, 1)
    this.label.y = -22
    // Fondo tipo "pastilla" oscura detrás del nombre, para leerlo sobre el pasto (como Diablo).
    this.labelBg = new Graphics()
    const pad = 5, lw = this.label.width + pad * 2, lh = 16
    this.labelBg.roundRect(-lw / 2, -lh - 5, lw, lh, 4).fill({ color: 0x0a090c, alpha: 0.72 })
    this.labelBg.stroke({ color: this.tint, width: 1, alpha: 0.5 })
    this.labelBg.y = -18
    this.view.addChild(this.labelBg)
    this.view.addChild(this.label)
    // Ocultas por defecto (Diablo): se revelan con Alt / botón / al acercarse.
    this.label.visible = false
    this.labelBg.visible = false

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  // Muestra u oculta el nombre del loot (revelar todo con Alt, o cuando el jugador está cerca).
  setReveal(v) {
    if (this.label) this.label.visible = v
    if (this.labelBg) this.labelBg.visible = v
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  update(dt) {
    this._t += dt
    this.age += dt
    // apenas respira (apoyado en el piso), con un brillo suave de rareza.
    if (this.sprite) this.sprite.y = -3 + Math.sin(this._t * 2) * 0.8
    else if (this.coins) this.coins.y = Math.sin(this._t * 2) * 0.6
    this.glow.alpha = 0.14 + 0.08 * (0.5 + 0.5 * Math.sin(this._t * 2))
    // Despawn: se desvanece en los últimos segundos y luego se marca vencido (lo saca el Game).
    if (this.age > TTL - FADE) this.view.alpha = Math.max(0, (TTL - this.age) / FADE)
    if (this.age >= TTL) this.expired = true
  }

  destroy() {
    // Libera el wrapper de Texture por-instancia (NO la source compartida de icons.png) para no
    // acumular texturas en el heap al recoger/vencer mucho loot en una sesión larga. Idempotente
    // (null tras liberar) para no chocar con la liberación del teardown.
    if (this._ownTex) { this._ownTex.destroy(false); this._ownTex = null }
    this.view.destroy({ children: true })
  }
}
