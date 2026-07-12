// Smoke test headless de la Fase 1: renderiza Black Oak City, camina con A* y
// verifica que el jugador NUNCA queda dentro de una pared (regla de colisión).
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'

// Config por entorno (CI u otras máquinas):
//   CHROME_PATH  binario de Chromium/Chrome (default: el de Playwright)
//   SMOKE_URL    URL del dev server (default: http://127.0.0.1:5173/)
//   SHOT_DIR     dónde dejar los screenshots (default: temp del SO)
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const URL = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const OUT = process.env.SHOT_DIR || tmpdir()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ],
})
const page = await browser.newPage({
  viewport: { width: 412, height: 915 },   // Samsung retrato aprox
  deviceScaleFactor: 2,
})
const errors = []
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  if (t.includes('favicon')) return // el navegador pide favicon.ico solo; irrelevante
  errors.push('console: ' + t)
})
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.click('.enter')                    // Inicio -> Comenzar
await page.waitForSelector('.race', { timeout: 10000 })
await page.click('.race-inner .enter')        // Encarnar (raza por defecto)

// Esperar a que el juego exponga su estado.
await page.waitForFunction(() => window.__vigilia && window.__vigilia.player, { timeout: 20000 })
await sleep(1200) // unos frames para poblar el cull

await page.screenshot({ path: OUT + '/black_oak_city.png' })

// --- datos del render ---
const info = await page.evaluate(() => {
  const g = window.__vigilia
  return {
    map: g.world.map.title,
    w: g.world.map.w, h: g.world.map.h,
    tileset: g.world.tileset.name,
    tilesetTiles: Object.keys(g.world.tileset.tiles).length,
    spawn: g.world.map.spawn,
    player: { x: g.player.tx, y: g.player.ty },
    visibleTiles: g.renderer.visibleTiles,
    groundChildren: g.renderer.groundLayer.children.length,
    objectChildren: g.renderer.objectLayer.children.length,
    rendererType: g.app.renderer.type, // 1=webgl 2=webgpu
  }
})

// --- prueba de caminata larga con A* + colisión ---
// Buscamos un tile caminable lejano (hacia el centro) y pedimos ir. Muestreamos el
// tile del jugador durante todo el trayecto: NUNCA debe estar bloqueado.
const plan = await page.evaluate(() => {
  const g = window.__vigilia
  // destino caminable LEJANO al jugador (agnóstico del mapa)
  let dest = null
  for (let r = 30; r >= 8 && !dest; r--) {
    for (let a = 0; a < 16 && !dest; a++) {
      const x = Math.round(g.player.tx + Math.cos(a) * r)
      const y = Math.round(g.player.ty + Math.sin(a) * r)
      if (g.grid.isWalkable(x, y)) dest = { x, y }
    }
  }
  const path = g.player.walkTo(dest.x, dest.y)
  return { dest, pathLen: path.length, start: { x: g.player.tx, y: g.player.ty } }
})

const startDist = Math.hypot(plan.start.x - plan.dest.x, plan.start.y - plan.dest.y)
let violations = 0
let samples = 0
let reached = false
let endDist = startDist
for (let i = 0; i < 260; i++) {          // hasta ~15.6s
  await sleep(60)
  const s = await page.evaluate(() => {
    const g = window.__vigilia
    const tx = Math.round(g.player.tx), ty = Math.round(g.player.ty)
    return { tx, ty, blocked: g.grid.isBlocked(tx, ty), moving: g.player.moving,
             x: g.player.tx, y: g.player.ty }
  })
  samples++
  if (s.blocked) violations++
  endDist = Math.hypot(s.x - plan.dest.x, s.y - plan.dest.y)
  if (!s.moving) { reached = endDist < 1.5; break }
}
// Con el suavizado (string-pulling) el camino tiene pocos waypoints largos, así que
// medimos progreso REAL en distancia hacia el destino, no waypoints.
const progress = startDist - endDist
const progressed = reached || progress >= 12

// Además unos taps sueltos para ejercitar el input de pantalla.
let moved = 0
let lastPos = await page.evaluate(() => ({ x: window.__vigilia.player.tx, y: window.__vigilia.player.ty }))
for (const [x, y] of [[206, 400], [140, 600], [280, 500]]) {
  await page.mouse.click(x, y)
  for (let i = 0; i < 20; i++) {
    await sleep(60)
    const b = await page.evaluate(() => {
      const g = window.__vigilia
      return g.grid.isBlocked(Math.round(g.player.tx), Math.round(g.player.ty))
    })
    if (b) violations++
  }
  const p = await page.evaluate(() => ({ x: window.__vigilia.player.tx, y: window.__vigilia.player.ty }))
  if (Math.hypot(p.x - lastPos.x, p.y - lastPos.y) > 0.5) moved++
  lastPos = p
}

// FPS del store (medido en headless swiftshader: solo indicativo, no es hardware real).
const fps = await page.evaluate(() => {
  // leer del DOM de telemetría
  const el = document.querySelector('.telemetry span')
  return el ? el.textContent : '?'
})

console.log(JSON.stringify(
  { info, plan, samples, violations, reached, progress: +progress.toFixed(1), moved, fps, errors },
  null, 2))

await browser.close()
if (errors.length) { console.error('HUBO ERRORES DE PÁGINA'); process.exit(2) }
if (violations > 0) { console.error(`COLISIÓN VIOLADA ${violations} veces`); process.exit(3) }
if (!plan.dest) { console.error('no encontré destino caminable'); process.exit(4) }
if (!progressed) { console.error(`El jugador no avanzó hacia el destino (progreso ${progress.toFixed(1)})`); process.exit(5) }
if (moved < 2) { console.error(`Los taps casi no movieron al jugador (${moved}/3)`); process.exit(6) }
console.log('SMOKE OK')
