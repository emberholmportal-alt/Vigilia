// Orquestador del juego (Fase 1): Pixi Application + loop.
// React NO entra acá: solo lee el store que este loop actualiza.

import { Application, Container, Graphics } from 'pixi.js'
import { Iso } from './iso.js'
import { loadWorld } from './assets.js'
import { Grid } from './Pathfinding.js'
import { MapRenderer } from './MapRenderer.js'
import { Camera } from './Camera.js'
import { Player } from './Player.js'

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

    const world = await loadWorld(mapName)
    if (this.destroyed) { app.destroy(true); return }
    this.world = world
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

    // Marcador de destino (feedback de tap sobre el suelo).
    this.ping = new Graphics()
    this.ping.visible = false
    renderer.groundLayer.addChild(this.ping)

    // Jugador en el CENTRO de la ciudad (no en la puerta de roble). Va DENTRO del
    // objectLayer para depth-sort con los props.
    const spawn = centralSpawn(grid, world.map)
    const player = new Player(iso, grid, world.manifest, spawn.x, spawn.y)
    renderer.objectLayer.addChild(player.view)
    this.player = player
    await player.setEquipment(equipToGfx(this.store.getEquipment()))

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

    // Hook de inspección para tests/depuración (solo dev).
    if (import.meta.env.DEV) window.__vigilia = this

    // Loop. (StrictMode puede desmontar durante los awaits de arriba.)
    if (this.destroyed) { app.destroy(true); return }
    this._fpsAccum = 0
    this._fpsFrames = 0
    app.ticker.add(this._tick)
  }

  _onResize = () => {
    if (!this.app) return
    this.camera.resize(this.app.screen.width, this.app.screen.height)
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
        this._showPing(dest.x, dest.y)
      }
    }
    app.stage.on('pointertap', onTap)
    this._onTap = onTap
  }

  _showPing(tx, ty) {
    const p = this.ping
    p.clear()
    p.x = this.iso.toWorldX(tx, ty)
    p.y = this.iso.toWorldY(tx, ty)
    p.ellipse(0, 0, this.iso.wHalf * 0.55, this.iso.hHalf * 0.55)
      .stroke({ color: 0xc9a227, width: 2, alpha: 0.9 })
    p.visible = true
    p.alpha = 1
    this._pingT = 0.6
  }

  _tick = (ticker) => {
    const dtFrames = ticker.deltaTime            // ~1 a 60fps
    const dt = ticker.deltaMS / 1000             // segundos

    this.player.update(dt)
    this.camera.follow(this.player.tx, this.player.ty)
    this.camera.update(dtFrames)

    // Posicionar el mundo según la cámara.
    this.worldContainer.x = this.camera.offsetX
    this.worldContainer.y = this.camera.offsetY

    // Culling de tiles.
    this.renderer.update(this.camera)

    // Ping fade.
    if (this._pingT > 0) {
      this._pingT -= dt
      this.ping.alpha = Math.max(0, this._pingT / 0.6)
      if (this._pingT <= 0) this.ping.visible = false
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
