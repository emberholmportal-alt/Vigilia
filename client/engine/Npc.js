// NPC de ciudad: un sprite de Flare (anim `stance`), nombre sobre la cabeza y diálogo
// al tocarlo. Los NPCs de Flare no tienen animación de caminar, así que —como en
// Diablo— se quedan en su puesto y le dan vida a la plaza con presencia y charla.

import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { screenVecToDir } from './Paperdoll.js'

const BASE = import.meta.env.BASE_URL || '/'
const PATROL_PX = 46 // velocidad de paseo del NPC (px de pantalla/seg)

export class Npc {
  constructor(manifest, def, iso) {
    this.manifest = manifest
    this.def = def
    this.iso = iso
    this.tx = def.x
    this.ty = def.y
    this.dir = def.dir ?? 7
    this.lines = def.lines || []
    this._lineIdx = 0
    this._frame = 0
    this._elapsed = 0
    this._speechT = 0
    // patrulla: lista de tiles [x,y]; se pasea entre ellos y pausa al llegar.
    this.patrol = def.patrol || null
    this._pIdx = 0
    this._pauseT = 0

    this.view = new Container()
    this.sprite = new Sprite()
    this.view.addChild(this.sprite)

    // nombre (los landmarks no muestran nombre salvo que se indique)
    this.nameText = null
    if (def.name) {
      this.nameText = new Text({
        text: def.name,
        style: {
          fontFamily: 'Georgia, serif', fontSize: 12,
          fill: def.landmark ? '#c9a227' : '#c9b48a',
          stroke: { color: '#0a090c', width: 3 }, align: 'center',
        },
      })
      this.nameText.anchor.set(0.5, 1)
      this.view.addChild(this.nameText)
    }

    // globo de diálogo
    this.bubble = new Container()
    this.bubbleBg = new Graphics()
    this.bubbleText = new Text({
      text: '', style: {
        fontFamily: 'Georgia, serif', fontSize: 13, fill: '#f2ead6',
        stroke: { color: '#0a090c', width: 3 }, align: 'center', wordWrap: false,
      },
    })
    this.bubbleText.anchor.set(0.5, 1)
    this.bubble.addChild(this.bubbleBg, this.bubbleText)
    this.bubble.visible = false
    this.view.addChild(this.bubble)
  }

  async load() {
    const d = this.manifest.npcs[this.def.sprite]
    if (!d) return false
    this.d = d
    const tex = await Assets.load(BASE + 'assets/' + d.src)
    this.sprite.texture = new Texture({
      source: tex.source, frame: new Rectangle(0, 0, d.cell[0], d.cell[1]),
    })
    this.sprite.anchor.set(d.anchor[0] / d.cell[0], d.anchor[1] / d.cell[1])

    const headY = -(d.anchor[1] + 6)
    if (this.nameText) this.nameText.y = headY
    this.bubble.y = headY - 16

    // posición en el mundo
    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty

    // tocable
    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
    this._applyFrame()
    return true
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  talk() {
    if (!this.lines.length) return
    const line = this.lines[this._lineIdx % this.lines.length]
    this._lineIdx++
    this.bubbleText.text = line
    // Estimamos el ancho por caracteres (las métricas de Pixi sub-miden con esta
    // fuente); así el fondo nunca recorta el texto.
    const b = this.bubbleText.getLocalBounds()
    const w = Math.ceil(b.width) + 24
    const h = Math.ceil(b.height) + 12
    this.bubbleBg.clear()
    this.bubbleBg.roundRect(-w / 2, -h, w, h, 6)
      .fill({ color: 0x14111a, alpha: 0.92 })
      .stroke({ color: 0x3b3145, width: 1 })
    this.bubbleText.y = -6
    this.bubble.visible = true
    this._speechT = 4.5
  }

  update(dt) {
    // Patrulla (solo si no está hablando). Se mueve en pixel de mundo para velocidad
    // de pantalla constante, mira hacia donde va, y pausa en cada punto.
    let walking = false
    if (this.patrol && this.patrol.length > 1 && this._speechT <= 0) {
      if (this._pauseT > 0) {
        this._pauseT -= dt
      } else {
        walking = true
        const [gx, gy] = this.patrol[this._pIdx]
        const wx = this.iso.toWorldX(this.tx, this.ty)
        const wy = this.iso.toWorldY(this.tx, this.ty)
        const twx = this.iso.toWorldX(gx, gy)
        const twy = this.iso.toWorldY(gx, gy)
        const dxp = twx - wx, dyp = twy - wy
        const distp = Math.hypot(dxp, dyp)
        const step = PATROL_PX * dt
        if (distp <= step || distp === 0) {
          this.tx = gx; this.ty = gy
          this._pIdx = (this._pIdx + 1) % this.patrol.length
          this._pauseT = 1.6 + (this._pIdx % 3) * 0.8 // pausa a mirar
        } else {
          const t = this.iso.toTile(wx + (dxp / distp) * step, wy + (dyp / distp) * step)
          this.tx = t.x; this.ty = t.y
          this.dir = screenVecToDir(dxp, dyp)
        }
        this.view.x = this.iso.toWorldX(this.tx, this.ty)
        this.view.y = this.iso.toWorldY(this.tx, this.ty)
        this.view.zIndex = this.tx + this.ty
      }
    }

    // Rebote de caminata: los sprites de NPC son de 1 frame (Flare no les dio anim de
    // caminar), así que fingimos el paso con un hop vertical mientras patrullan. Sin esto
    // se deslizan como fantasmas.
    this._walkT = (this._walkT || 0) + dt
    const targetHop = walking ? -Math.abs(Math.sin(this._walkT * 7)) * 2.6 : 0
    this.sprite.y += (targetHop - this.sprite.y) * Math.min(1, dt * 14) // ease al valor

    // anim stance (loop/pingpong)
    const st = this.d && this.d.anims.stance
    if (st) {
      this._elapsed += dt * 1000
      const per = st.ms / st.frames
      while (this._elapsed >= per) {
        this._elapsed -= per
        this._frame++
        if (st.pingpong) { if (this._frame >= st.frames * 2 - 2) this._frame = 0 }
        else if (this._frame >= st.frames) this._frame = st.loop ? 0 : st.frames - 1
      }
      this._applyFrame()
    }
    if (this._speechT > 0) {
      this._speechT -= dt
      if (this._speechT <= 0) this.bubble.visible = false
    }
  }

  _applyFrame() {
    const st = this.d && this.d.anims.stance
    if (!st) return
    let f = this._frame
    if (st.pingpong && st.frames > 1) {
      const period = st.frames * 2 - 2
      const m = this._frame % period
      f = m < st.frames ? m : period - m
    } else {
      f = Math.min(this._frame, st.frames - 1)
    }
    const fr = this.sprite.texture.frame
    fr.x = (st.start + f) * this.d.cell[0]
    fr.y = this.dir * this.d.cell[1]
    fr.width = this.d.cell[0]
    fr.height = this.d.cell[1]
    this.sprite.texture.updateUvs()
  }
}
