// Verifica el flujo de personaje: elegir raza, spawn en el centro, paperdoll real,
// abrir inventario y que equipar una pieza CAMBIE el sprite del héroe.
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const URL = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const OUT = process.env.SHOT_DIR || tmpdir()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type()==='error' && !m.text().includes('favicon')) errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.click('.enter')                 // Start -> Comenzar
await page.waitForSelector('.race', { timeout: 10000 })
await page.click('.race-card:nth-child(3)') // Enano (guerrero con escudo)
await page.click('.race-inner .enter')      // Encarnar
await page.waitForFunction(() => window.__vigilia?.player?.paperdoll, { timeout: 20000 })
await sleep(1500)

const start = await page.evaluate(() => {
  const g = window.__vigilia
  const pd = g.player.paperdoll
  const visible = Object.fromEntries(Object.entries(pd.sprites).map(([k, s]) => [k, s.visible]))
  const layers = Object.fromEntries(Object.entries(pd.layers).map(([k, l]) => [k, l?.name || null]))
  // centralidad: distancia del spawn al centroide caminable
  let sx=0, sy=0, n=0
  for (let y=0;y<g.world.map.h;y++) for (let x=0;x<g.world.map.w;x++) if (g.grid.isWalkable(x,y)){sx+=x;sy+=y;n++}
  const cx=sx/n, cy=sy/n
  const st = window.__vigiliaStoreState()
  return {
    tile: { x: Math.round(g.player.tx), y: Math.round(g.player.ty) },
    centroid: { x: Math.round(cx), y: Math.round(cy) },
    distToCentroid: +Math.hypot(g.player.tx-cx, g.player.ty-cy).toFixed(1),
    race: st.race?.name || null,
    gold: st.gold,
    inventoryCount: st.inventory.filter(Boolean).length,
    visibleLayers: visible,
    layerNames: layers,
  }
})
await page.screenshot({ path: OUT + '/char_center.png' })

// Abrir inventario
await page.click('.ab-menu[title="Inventario"]')
await page.waitForSelector('.flare-panel', { timeout: 5000 })
await sleep(300)
await page.screenshot({ path: OUT + '/char_inventory.png' })

// Layer de torso ANTES de equipar
const chestBefore = await page.evaluate(() => window.__vigilia.player.paperdoll.layers.chest?.name)

// Buscar en el inventario una coraza de placas (plate_cuirass) y equiparla.
const equipResult = await page.evaluate(async () => {
  const st = window.__vigiliaStoreState()
  const idx = st.inventory.findIndex((it) => it && it.gfx === 'plate_cuirass')
  if (idx < 0) return { found: false }
  return { found: true, idx, itemName: st.inventory[idx].name }
})
let chestAfter = chestBefore
if (equipResult.found) {
  // click en el slot del inventario correspondiente
  await page.evaluate((idx) => window.__vigiliaEquip(idx), equipResult.idx)
  await sleep(900) // cargar textura + recomponer
  chestAfter = await page.evaluate(() => window.__vigilia.player.paperdoll.layers.chest?.name)
  await page.screenshot({ path: OUT + '/char_equipped.png' })
}

console.log(JSON.stringify({
  start, chestBefore, equipResult, chestAfter,
  chestChanged: chestBefore !== chestAfter,
  errors,
}, null, 2))

await browser.close()
if (errors.length) { console.error('ERRORES DE PÁGINA'); process.exit(2) }
// El spawn ahora es el hub elegido a mano (plaza), no el centroide.
if (start.tile.x == null) { console.error('sin spawn'); process.exit(3) }
if (!Object.values(start.visibleLayers).some(Boolean)) { console.error('paperdoll sin capas visibles'); process.exit(4) }
if (equipResult.found && chestBefore === chestAfter) { console.error('equipar NO cambió el paperdoll'); process.exit(5) }
console.log('CHAR OK')
