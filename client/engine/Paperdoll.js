// Paperdoll: compone al héroe desde las capas de avatar de Flare (assets.json).
//
// Cada capa (default_chest, plate_cuirass, longsword, shield, ...) es un spritesheet
// de cols×8: la fila es la dirección (0=SW..7=S), la columna es el frame. Todas las
// capas comparten celda y ancla (las fija tools/extract_flare.py), así se apilan con
// un simple sprite por capa.
//
// Orden de dibujo por dirección: engine/hero_layers.txt. Mirando al sur el arma va
// DETRÁS del cuerpo; mirando al norte, ADELANTE. Por eso el zIndex de cada tipo de
// capa cambia con la dirección.
//
// Rendimiento: un solo héroe en pantalla por ahora, así que componemos con 7 sprites
// vivos y solo mutamos su frame/zIndex por tick (sin re-crear texturas). Cuando haya
// muchos jugadores (Fase 7) se pre-componen a RenderTexture por dirección/frame.

import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js'

const BASE = import.meta.env.BASE_URL || '/'

// Orden de tipos por dirección (de hero_layers.txt). El primero se dibuja primero (atrás).
const HERO_LAYERS = {
  SW: ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'],
  W: ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'],
  NW: ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'],
  N: ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'],
  NE: ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'],
  E: ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'],
  SE: ['feet', 'legs', 'hands', 'main', 'chest', 'head', 'off'],
  S: ['main', 'feet', 'legs', 'hands', 'chest', 'head', 'off'],
}

const DIR_NAMES = ['SW', 'W', 'NW', 'N', 'NE', 'E', 'SE', 'S']
const TYPES = ['feet', 'legs', 'hands', 'chest', 'head', 'main', 'off']

// Capa por defecto (cuerpo base) cuando el slot está vacío. main/off no tienen: sin
// arma ni escudo no se dibuja nada.
const DEFAULT_LAYER = {
  feet: 'default_feet',
  legs: 'default_legs',
  hands: 'default_hands',
  chest: 'default_chest',
  head: 'head_short',
  main: null,
  off: null,
}

// atan2(vy,vx) en espacio de PANTALLA -> índice de dirección de Flare.
// octantes: 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE
const OCTANT_TO_DIR = [5, 6, 7, 0, 1, 2, 3, 4]

export function screenVecToDir(vx, vy) {
  const oct = ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8
  return OCTANT_TO_DIR[oct]
}

// Cache de baseTextures de capas de avatar (por nombre de capa).
const texCache = new Map()
async function loadLayerSource(manifest, name) {
  if (texCache.has(name)) return texCache.get(name)
  const def = manifest.layers[name]
  if (!def) return null
  const p = Assets.load(BASE + 'assets/' + def.src).then((t) => t.source)
  texCache.set(name, p)
  return p
}

export class Paperdoll {
  constructor(manifest) {
    this.manifest = manifest
    this.view = new Container()
    this.view.sortableChildren = true

    // celda/ancla son uniformes (las fija el extractor). Tomamos las de una capa base.
    const ref = manifest.layers.default_chest || Object.values(manifest.layers)[0]
    this.cellW = ref.cell[0]
    this.cellH = ref.cell[1]
    this.anchorX = ref.anchor[0]
    this.anchorY = ref.anchor[1]

    // Un sprite por tipo de capa.
    this.sprites = {}
    for (const type of TYPES) {
      const s = new Sprite()
      s.anchor.set(this.anchorX / this.cellW, this.anchorY / this.cellH)
      s.visible = false
      this.view.addChild(s)
      this.sprites[type] = s
    }

    // Estado actual por tipo: { layerName, source, def(anims/cell) }
    this.layers = {}
    this.equip = {} // slot -> gfx (nombre de capa) o null
    this._dir = 7   // mirando al sur
    this._anim = 'stance'
    this._frame = 0
    this._elapsed = 0
    this._oneShot = null   // anim no-loop en curso (swing/hit/die); bloquea stance/run
    this._oneShotT = 0
    this._lastKey = ''
  }

  // equip: { chest, legs, hands, feet, head, main, off } con nombres de capa (gfx) o null.
  async setEquipment(equip) {
    this.equip = { ...equip }
    // Resolver capa efectiva por tipo (equipada o base) y cargar sus fuentes.
    const jobs = TYPES.map(async (type) => {
      const name = this.equip[type] || DEFAULT_LAYER[type]
      if (!name || !this.manifest.layers[name]) {
        this.layers[type] = null
        return
      }
      const source = await loadLayerSource(this.manifest, name)
      const def = this.manifest.layers[name]
      // Textura propia por sprite; mutamos su frame por tick.
      const s = this.sprites[type]
      // El dueño (p. ej. un jugador remoto) puede haberse destruido mientras cargábamos la capa
      // (setEquipment corre sin await del constructor). Si el sprite ya está destruido, cortamos:
      // asignarle textura sería un use-after-free y crearía un wrapper que nadie liberaría.
      if (!s || s.destroyed) return
      if (!s.texture || s._layerName !== name) {
        // Al recambiar la capa (cambio de equipo), liberar el wrapper anterior antes de crear el
        // nuevo. El guard `_layerName` asegura que sólo destruimos wrappers propios (no EMPTY).
        if (s._layerName && s.texture) s.texture.destroy(false)
        s.texture = new Texture({ source, frame: new Rectangle(0, 0, def.cell[0], def.cell[1]) })
        s._layerName = name
      }
      this.layers[type] = { name, def }
    })
    await Promise.all(jobs)
    this._lastKey = '' // forzar refresco de frames
    this._apply()
  }

  setDirection(dir) {
    if (dir === this._dir) return
    this._dir = dir
    this._reorder()
  }

  setMoving(moving) {
    if (this._oneShot) return          // no interrumpir swing/hit/die
    const anim = moving ? 'run' : 'stance'
    if (anim !== this._anim) {
      this._anim = anim
      this._frame = 0
      this._elapsed = 0
    }
  }

  // Reproduce una anim no-loop una vez (swing/hit/die) y vuelve sola a stance/run.
  // `hold`: si es true (muerte), se queda en el último frame.
  playOnce(anim, hold = false) {
    const t = this._timing(anim)
    if (!t) return 0
    this._anim = anim
    this._frame = 0
    this._elapsed = 0
    this._oneShot = anim
    this._oneShotHold = hold
    this._oneShotT = t.ms
    return t.ms
  }

  // Reordena los sprites por hero_layers según la dirección actual.
  _reorder() {
    const order = HERO_LAYERS[DIR_NAMES[this._dir]]
    for (let i = 0; i < order.length; i++) {
      const s = this.sprites[order[i]]
      if (s) s.zIndex = i
    }
  }

  // Avanza la animación. dt en segundos. factor escala la cadencia (para sincronizar
  // correr con la velocidad real y que los pies no patinen).
  update(dt, factor = 1) {
    // Anim de un solo tiro (swing/hit/die): al terminar vuelve a stance/run.
    if (this._oneShot) {
      this._oneShotT -= dt * 1000
      if (this._oneShotT <= 0 && !this._oneShotHold) this._oneShot = null
    }
    // duración del frame: la tomamos de la capa chest (o la primera que tenga la anim).
    const timing = this._timing(this._anim)
    if (timing) {
      this._elapsed += dt * 1000 * factor
      const per = timing.ms / timing.frames
      while (this._elapsed >= per) {
        this._elapsed -= per
        this._frame++
        if (timing.pingpong) {
          // ping-pong: 0..n-1..0 (lo resolvemos en _resolveFrame)
          if (this._frame >= timing.frames * 2 - 2) this._frame = 0
        } else if (this._frame >= timing.frames) {
          this._frame = timing.loop ? 0 : timing.frames - 1
        }
      }
    }
    this._apply()
  }

  _timing(anim) {
    for (const type of ['chest', 'legs', 'feet']) {
      const l = this.layers[type]
      if (l && l.def.anims[anim]) return l.def.anims[anim]
    }
    // cualquiera que tenga la anim
    for (const type of TYPES) {
      const l = this.layers[type]
      if (l && l.def.anims[anim]) return l.def.anims[anim]
    }
    return null
  }

  _resolveFrame(timing) {
    if (!timing) return 0
    if (timing.pingpong && timing.frames > 1) {
      const period = timing.frames * 2 - 2
      const f = this._frame % period
      return f < timing.frames ? f : period - f
    }
    return Math.min(this._frame, timing.frames - 1)
  }

  _apply() {
    const key = this._dir + '|' + this._anim + '|' + this._frame
    if (key === this._lastKey) return
    this._lastKey = key
    this._reorder()

    for (const type of TYPES) {
      const s = this.sprites[type]
      const l = this.layers[type]
      if (!l) { s.visible = false; continue }
      const anims = l.def.anims
      const anim = anims[this._anim] ? this._anim : 'stance'
      const timing = anims[anim]
      if (!timing) { s.visible = false; continue }
      const f = this._resolveFrame(timing)
      const col = timing.start + f
      const cw = l.def.cell[0], ch = l.def.cell[1]
      const fr = s.texture.frame
      fr.x = col * cw
      fr.y = this._dir * ch
      fr.width = cw
      fr.height = ch
      s.texture.updateUvs()
      s.visible = true
    }
  }

  // Libera los wrappers de Texture propios de cada capa (no la source compartida). Se usa al
  // destruir al dueño (jugador remoto que se va) sin destruir la vista (la maneja el caller).
  freeTextures() {
    for (const type of TYPES) {
      const s = this.sprites[type]
      if (s && s._layerName && s.texture) { s.texture.destroy(false); s._layerName = '' }
    }
  }

  destroy() {
    this.freeTextures()
    this.view.destroy({ children: true })
  }
}
