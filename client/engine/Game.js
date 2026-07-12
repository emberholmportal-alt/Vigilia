// Orquestador del juego (Fase 1): Pixi Application + loop.
// React NO entra acá: solo lee el store que este loop actualiza.

import { Application, Container, Graphics } from 'pixi.js'
import { Iso } from './iso.js'
import { loadWorld } from './assets.js'
import { Grid } from './Pathfinding.js'
import { MapRenderer } from './MapRenderer.js'
import { Camera } from './Camera.js'
import { Player, WALK_PX, RUN_PX } from './Player.js'
import { Npc } from './Npc.js'
import { screenVecToDir } from './Paperdoll.js'
import { NPCS_BY_MAP } from '../data/npcs.js'
import { stampStructures } from '../data/structures.js'
import { ParticleField } from './Particles.js'
import { GroundItem, loadIcons } from './GroundItem.js'
import { rollLoot } from '../../shared/loot.js'
import { itemById, RARITY_COLOR } from '../data/items.js'
import { playSfx } from './audio.js'

// Tinte del brillo mágico por landmark.
const GLOW_TINT = {
  statue_guardian_fire: 0xff7a2a, statue_guardian_ice: 0x6fd0ff,
  statue_guardian_wind: 0xbfe6b0, return_obelisk1: 0xd8c070, return_obelisk2: 0xd8c070,
}

const STAM_DRAIN = 22 // por segundo corriendo
const STAM_REGEN = 16 // por segundo si no

export class Game {
  constructor(store) {
    this.store = store          // setters de zustand
    this.app = null
    this.destroyed = false
  }

  async mount(canvasParent, mapName = 'black_oak_city') {
    const app = new Application()
    await app.init({
      background: '#0a090c',
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      resizeTo: canvasParent,
      powerPreference: 'high-performance',
    })
    if (this.destroyed) { app.destroy(true); return }
    this.app = app
    canvasParent.appendChild(app.canvas)
    // Permitir dt grandes en caídas de fps sin recortar tanto el movimiento (el
    // camino ya está validado, así que pasos grandes no atraviesan paredes).
    app.ticker.minFPS = 4

    const world = await loadWorld(mapName)
    if (this.destroyed) { app.destroy(true); return }
    this.world = world

    // Estampar edificios en el mapa abierto ANTES de crear grid y renderer.
    stampStructures(world.map, mapName)

    const iso = new Iso(world.map.tileW, world.map.tileH, world.tileset.scale)
    this.iso = iso

    const grid = new Grid(world.map.layers.collision, world.map.w, world.map.h)
    this.grid = grid

    const renderer = new MapRenderer(iso, world.map, world.tileset)
    this.renderer = renderer

    const camera = new Camera(iso, world.map.w, world.map.h)
    camera.resize(app.screen.width, app.screen.height)
    this.camera = camera

    // Contenedor del mundo: lo desplaza la cámara.
    const worldContainer = new Container()
    worldContainer.addChild(renderer.root)
    app.stage.addChild(worldContainer)
    this.worldContainer = worldContainer

    // Marcador de destino (X sobre el suelo). zIndex alto para que quede por encima
    // de los tiles de pasto (que ordenan por x+y) pero debajo de objetos y personaje.
    this.ping = new Graphics()
    this.ping.visible = false
    this.ping.zIndex = 1e6
    renderer.groundLayer.addChild(this.ping)

    // Jugador en el centro del pueblo (plaza con cabañas), no en la puerta de roble.
    const spawn = hubOrCentralSpawn(mapName, grid, world.map)
    const player = new Player(iso, grid, world.manifest, spawn.x, spawn.y)
    renderer.objectLayer.addChild(player.view)
    this.player = player
    player.setName(this.store.getPlayerName())
    await player.setEquipment(equipToGfx(this.store.getEquipment()))

    // NPCs de la plaza (vida de la ciudad). Se quedan quietos en su tile, se bloquea ese
    // tile para que el jugador los rodee, y al tocarlos hablan.
    this.npcs = []
    for (const def of NPCS_BY_MAP[mapName] || []) {
      let x = def.x, y = def.y
      if (!def.landmark && !grid.isWalkable(x, y)) {
        const near = grid.nearestWalkable(x, y, 4)
        if (near) { x = near.x; y = near.y }
      }
      const npc = new Npc(world.manifest, { ...def, x, y }, iso)
      const ok = await npc.load()
      if (this.destroyed) { app.destroy(true); return }
      if (!ok) continue
      renderer.objectLayer.addChild(npc.view)
      grid.blocked[y * grid.w + x] = 1
      npc.onTap((n) => this._talkTo(n))
      this.npcs.push(npc)
    }

    // Cofres del mapa (loot). El tile del cofre ya está en la capa `object`; le sumamos
    // un brillo dorado que pulsa (para que se note) y un hotspot para abrirlo.
    await loadIcons()
    this.groundItems = []
    this._pendingChest = null
    this._buildChests(renderer, iso, world.map, grid)

    // Partículas ambientales: luciérnagas sobre la plaza + brillo en los landmarks.
    this.particles = new ParticleField(app.renderer)
    renderer.root.addChild(this.particles.container)
    const sc = iso.toWorld(spawn.x, spawn.y)
    this.particles.addEmitter({
      x: sc.x, y: sc.y - 24, rx: iso.wHalf * 11, ry: iso.hHalf * 11,
      rate: 11, tint: 0xffe08a, vy: -4, spread: 5, life: 3.6, size: 1,
    })
    for (const npc of this.npcs) {
      if (!npc.def.landmark) continue
      const w = iso.toWorld(npc.tx, npc.ty)
      const tint = npc.def.glow || GLOW_TINT[npc.def.sprite] || 0xffcf5a
      // Los portales brillan más fuerte y más alto (columna arcana).
      this.particles.addEmitter(npc.def.portal
        ? { x: w.x, y: w.y - 34, rx: 7, ry: 5, rate: 16, tint, vy: -30, spread: 6, life: 2.2, size: 1.1 }
        : { x: w.x, y: w.y - 30, rx: 9, ry: 6, rate: 9, tint, vy: -20, spread: 5, life: 1.8, size: 0.9 })
    }

    camera.follow(player.tx, player.ty)
    camera.snap()

    this._setupInput(app, camera, player, iso)
    window.addEventListener('resize', this._onResize)

    // El equipo lo maneja la UI (React) como fuente de verdad; Pixi reacciona.
    this._unsub = this.store.onEquipmentChange((equip) => {
      player.setEquipment(equipToGfx(equip))
    })

    // Estado inicial al HUD.
    this.store.setMapTitle(world.map.title || mapName)
    this.store.setMinimap(this._buildMinimap(world.map))

    // Hook de inspección para tests/depuración (solo dev).
    if (import.meta.env.DEV) window.__vigilia = this

    // Loop. (StrictMode puede desmontar durante los awaits de arriba.)
    if (this.destroyed) { app.destroy(true); return }
    this._fpsAccum = 0
    this._fpsFrames = 0
    app.ticker.add(this._tick)
  }

  // Tocar un NPC: el jugador se acerca, el NPC te mira y se abre la caja de diálogo.
  _talkTo(npc) {
    this.player.walkTo(npc.tx, npc.ty) // A* enruta a un tile adyacente (el suyo está bloqueado)
    const pv = this.iso.toWorld(this.player.tx, this.player.ty)
    const nv = this.iso.toWorld(npc.tx, npc.ty)
    npc.dir = screenVecToDir(pv.x - nv.x, pv.y - nv.y)
    if (npc.def.shop) this.store.openShop(npc.def.name)
    else this.store.openDialogue({ name: npc.def.name, portrait: npc.def.portrait, lines: npc.lines })
  }

  // --- Cofres y loot ---------------------------------------------------------

  // Crea los cofres del mapa: brillo dorado que pulsa + hotspot para abrir.
  _buildChests(renderer, iso, map, grid) {
    this.chests = []
    for (const c of map.chests || []) {
      const wx = iso.toWorldX(c.x, c.y), wy = iso.toWorldY(c.x, c.y)

      const glow = new Graphics()
      glow.ellipse(0, 0, iso.wHalf * 0.7, iso.hHalf * 0.7).fill({ color: 0xffcf5a, alpha: 0.3 })
      glow.x = wx; glow.y = wy
      glow.zIndex = c.x + c.y - 1
      renderer.groundLayer.addChild(glow)

      // hotspot invisible sobre el tile del cofre (el sprite ya está dibujado en object).
      const hot = new Graphics()
      hot.poly([0, -iso.hHalf, iso.wHalf, 0, 0, iso.hHalf, -iso.wHalf, 0]).fill({ color: 0xffffff, alpha: 0.001 })
      hot.x = wx; hot.y = wy - iso.hHalf
      hot.zIndex = 1e6
      hot.eventMode = 'static'
      hot.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
      renderer.objectLayer.addChild(hot)

      const chest = { x: c.x, y: c.y, loot: c.loot, opened: false, glow, hot }
      hot.on('pointertap', (e) => { e.stopPropagation(); this._tapChest(chest) })
      this.chests.push(chest)
    }
  }

  // Tocar un cofre: caminar hasta él; se abre al llegar (en el tick).
  _tapChest(chest) {
    if (chest.opened) return
    this.player.walkTo(chest.x, chest.y) // A* enruta a un tile adyacente si está bloqueado
    this._pendingChest = chest
  }

  // Abre el cofre: tira la tabla real de Flare, suma oro y desparrama los ítems.
  _openChest(chest) {
    chest.opened = true
    if (chest.glow) { chest.glow.destroy(); chest.glow = null }
    if (chest.hot) { chest.hot.eventMode = 'none'; chest.hot.cursor = 'default' }
    playSfx('wood_open.ogg')

    const roll = rollLoot(chest.loot)
    if (roll.gold > 0) this.store.addGold(roll.gold)

    const tiles = this._scatterTiles(chest.x, chest.y, roll.drops.length)
    roll.drops.forEach((d, i) => {
      const item = itemById(d.id)
      if (!item) return
      const [tx, ty] = tiles[i] || [chest.x, chest.y]
      const gi = new GroundItem(this.iso, tx, ty, item, d.qty, RARITY_COLOR[item.rarity])
      gi.onTap((g) => { this.player.walkTo(g.tx, g.ty) }) // caminar hacia él; se recoge al pasar
      this.renderer.objectLayer.addChild(gi.view)
      this.groundItems.push(gi)
    })
  }

  // Tiles caminables alrededor del cofre para repartir el loot (sin repetir).
  _scatterTiles(cx, cy, n) {
    const ring = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]]
    const out = []
    for (const [dx, dy] of ring) {
      if (out.length >= n) break
      const x = cx + dx, y = cy + dy
      if (this.grid.isWalkable(x, y) && !out.some(([ox, oy]) => ox === x && oy === y)) out.push([x, y])
    }
    while (out.length < n) out.push([cx, cy]) // fallback: encima del cofre
    return out
  }

  // Recoge un ítem del suelo (oro ya se sumó al abrir). Devuelve true si entró.
  _pickup(gi) {
    if (!this.store.addItem(gi.item, gi.qty)) return false // inventario lleno: queda en el piso
    playSfx('flying_loot.ogg')
    gi.picked = true
    gi.destroy()
    return true
  }

  _onResize = () => {
    if (!this.app) return
    this.camera.resize(this.app.screen.width, this.app.screen.height)
  }

  // Minimapa: proyección iso de la ciudad (misma orientación que la vista).
  _buildMinimap(map) {
    const w = map.w, h = map.h
    const co = map.layers.collision, bg = map.layers.background
    const scale = 0.72
    const pad = 3
    const minMx = -(h - 1)
    const cw = Math.ceil((w + h - 2) * scale) + pad * 2
    const ch = Math.ceil((w + h - 2) * 0.5 * scale) + pad * 2
    const cv = document.createElement('canvas')
    cv.width = cw; cv.height = ch
    const ctx = cv.getContext('2d')
    const dot = Math.max(1, scale * 1.5)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ground = bg[y][x] > 0
        if (!ground) continue // vacío -> transparente
        const walk = co[y][x] === 0
        ctx.fillStyle = walk ? 'rgba(150,138,110,0.72)' : 'rgba(40,34,46,0.85)'
        const mx = x - y, my = (x + y) * 0.5
        ctx.fillRect((mx - minMx) * scale + pad, my * scale + pad, dot, dot)
      }
    }
    return { url: cv.toDataURL('image/png'), scale, minMx, pad, w: cw, h: ch }
  }

  _setupInput(app, camera, player, iso) {
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    const onTap = (e) => {
      const w = camera.screenToWorld(e.global.x, e.global.y)
      const t = iso.toTile(w.x, w.y)
      const tx = Math.round(t.x)
      const ty = Math.round(t.y)
      const path = player.walkTo(tx, ty)
      if (path.length) {
        const dest = path[path.length - 1]
        this._showDestination(dest.x, dest.y)
      }
    }
    app.stage.on('pointertap', onTap)
    this._onTap = onTap
  }

  // Marca el destino con una X (estilo Diablo): queda mientras el personaje camina.
  _showDestination(tx, ty) {
    const p = this.ping
    p.clear()
    p.x = this.iso.toWorldX(tx, ty)
    p.y = this.iso.toWorldY(tx, ty)
    const rx = this.iso.wHalf * 0.62, ry = this.iso.hHalf * 0.62
    // halo oscuro (contraste) + X dorada encima, apoyada en el plano del piso
    p.moveTo(-rx, -ry).lineTo(rx, ry).moveTo(rx, -ry).lineTo(-rx, ry)
      .stroke({ color: 0x000000, width: 6, alpha: 0.55, cap: 'round' })
    p.moveTo(-rx, -ry).lineTo(rx, ry).moveTo(rx, -ry).lineTo(-rx, ry)
      .stroke({ color: 0xffcf5a, width: 3, alpha: 1, cap: 'round' })
    p.visible = true
    p.alpha = 1
    this._markT = 0
    this._markFade = 0
  }

  _tick = (ticker) => {
    const dtFrames = ticker.deltaTime            // ~1 a 60fps
    const dt = ticker.deltaMS / 1000             // segundos

    // Correr/caminar con stamina.
    const st = this.store.getRunState()
    const runningNow = st.running && st.stamina > 0 && this.player.moving
    let stamina = st.stamina
    if (runningNow) stamina = Math.max(0, stamina - STAM_DRAIN * dt)
    else stamina = Math.min(st.staminaMax, stamina + STAM_REGEN * dt)
    const speedPx = runningNow ? RUN_PX : WALK_PX

    this.player.update(dt, speedPx)

    // Diálogo sobre la cabeza.
    const sp = this.store.getSpeech()
    if (sp && Date.now() < sp.until) this.player.showBubble(sp.text)
    else this.player.hideBubble()

    // NPCs (anim idle + globos).
    for (const npc of this.npcs) npc.update(dt)

    // Abrir el cofre pendiente al llegar cerca.
    if (this._pendingChest && !this.player.moving) {
      const c = this._pendingChest
      const near = Math.abs(this.player.tx - c.x) <= 1.6 && Math.abs(this.player.ty - c.y) <= 1.6
      if (near && !c.opened) this._openChest(c)
      this._pendingChest = null
    }

    // Loot en el suelo: bob + recoger al caminarle encima.
    if (this.groundItems.length) {
      const px = this.player.tx, py = this.player.ty
      for (const gi of this.groundItems) {
        if (gi.picked) continue
        gi.update(dt)
        if (Math.abs(px - gi.tx) <= 0.75 && Math.abs(py - gi.ty) <= 0.75) this._pickup(gi)
      }
      this.groundItems = this.groundItems.filter((g) => !g.picked)
    }

    // Partículas ambientales.
    this._pt = (this._pt || 0) + dt
    this.particles.update(dt, this._pt)

    // Empujar la stamina y la posición (minimapa) al HUD a ~12Hz (no cada frame).
    this._stamAccum = (this._stamAccum || 0) + dt
    if (this._stamAccum >= 0.08 || (stamina === 0) !== (st.stamina === 0)) {
      this.store.setStamina(Math.round(stamina))
      this.store.setPlayerTile({ x: this.player.tx, y: this.player.ty })
      this._stamAccum = 0
    }
    this.camera.follow(this.player.tx, this.player.ty)
    this.camera.update(dtFrames)

    // Posicionar el mundo según la cámara.
    this.worldContainer.x = this.camera.offsetX
    this.worldContainer.y = this.camera.offsetY

    // Culling de tiles.
    this.renderer.update(this.camera)

    // Marcador de destino: pulsa mientras caminás; se desvanece al llegar.
    if (this.ping.visible) {
      this._markT += dt
      const pulse = 1 + 0.12 * Math.sin(this._markT * 9)
      this.ping.scale.set(pulse)
      if (!this.player.moving) {
        this._markFade += dt
        this.ping.alpha = Math.max(0, 1 - this._markFade / 0.35)
        if (this._markFade >= 0.35) this.ping.visible = false
      }
    }

    // Telemetría al HUD.
    this._fpsAccum += ticker.deltaMS
    this._fpsFrames++
    if (this._fpsAccum >= 500) {
      const fps = Math.round((this._fpsFrames * 1000) / this._fpsAccum)
      this.store.setFps(fps)
      this.store.setDebug({
        tile: `${Math.round(this.player.tx)},${Math.round(this.player.ty)}`,
        visibleTiles: this.renderer.visibleTiles,
      })
      this._fpsAccum = 0
      this._fpsFrames = 0
    }
  }

  destroy() {
    this.destroyed = true
    window.removeEventListener('resize', this._onResize)
    if (this._unsub) { this._unsub(); this._unsub = null }
    if (this.app) {
      this.app.ticker.remove(this._tick)
      this.app.destroy(true, { children: true, texture: false })
      this.app = null
    }
  }
}

// Slots visibles del paperdoll (ring/artifact no se ven).
const VISIBLE_SLOTS = ['chest', 'legs', 'hands', 'feet', 'head', 'main', 'off']

// equipment (slot -> item) -> mapa de capas gfx para el paperdoll.
function equipToGfx(equip) {
  const out = {}
  for (const slot of VISIBLE_SLOTS) {
    const it = equip && equip[slot]
    out[slot] = it && it.gfx ? it.gfx : null
  }
  return out
}

// Spawn de hub elegido a mano (plaza/centro) por mapa; si no, centroide abierto.
const HUB_SPAWN = { black_oak_city: [41, 13], black_oak_farm: [58, 54], lochport: [37, 27] }

function hubOrCentralSpawn(mapName, grid, map) {
  const h = HUB_SPAWN[mapName]
  if (h && grid.isWalkable(h[0], h[1])) return { x: h[0], y: h[1] }
  if (h) {
    const near = grid.nearestWalkable(h[0], h[1], 8)
    if (near) return near
  }
  return centralSpawn(grid, map)
}

// Spawn en el centro de la ciudad: cerca del centroide caminable, pero preferimos un
// tile bien rodeado de suelo (no al borde de un vacío) para una buena primera imagen.
function centralSpawn(grid, map) {
  const bg = map.layers.background
  let sx = 0, sy = 0, n = 0
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (grid.isWalkable(x, y)) { sx += x; sy += y; n++ }
    }
  }
  const cx = n ? Math.round(sx / n) : (map.w >> 1)
  const cy = n ? Math.round(sy / n) : (map.h >> 1)

  // Cuántos tiles de suelo hay en el entorno 7×7 (mide qué tan "lleno" está el lugar).
  const groundScore = (x, y) => {
    let c = 0
    for (let dy = -3; dy <= 3; dy++) {
      const row = bg[y + dy]
      if (!row) continue
      for (let dx = -3; dx <= 3; dx++) if (row[x + dx] > 0) c++
    }
    return c
  }

  let best = null, bestScore = -1
  for (let r = 0; r <= 18; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const x = cx + dx, y = cy + dy
        if (!grid.isWalkable(x, y)) continue
        const s = groundScore(x, y)
        if (s > bestScore) { bestScore = s; best = { x, y } }
      }
    }
    if (best && bestScore >= 44) break // entorno casi lleno: suficiente
  }
  return best || grid.nearestWalkable(cx, cy, 60) || { x: cx, y: cy }
}
