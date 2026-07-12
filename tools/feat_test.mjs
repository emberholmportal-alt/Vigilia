// Captura: plaza + nombre sobre la cabeza + minimapa + globo de diálogo + correr.
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.SHOT_DIR || tmpdir()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type()==='error' && !m.text().includes('favicon')) errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.click('.enter')
await page.waitForSelector('.race')
await page.fill('.name-input', 'Azrael')
await page.click('.race-card:nth-child(3)')
await page.click('.race-inner .enter')
await page.waitForFunction(() => window.__vigilia?.player?.paperdoll)
await sleep(1400)

const info = await page.evaluate(() => {
  const g = window.__vigilia
  return {
    tile: { x: Math.round(g.player.tx), y: Math.round(g.player.ty) },
    name: g.player.nameText.text,
    hasMinimap: !!window.__vigiliaStoreState().minimap,
    walkPx: null,
  }
})
await page.screenshot({ path: OUT + '/feat_plaza.png' })

// Chat -> globo sobre la cabeza
await page.click('.icon-btn')                 // abre chat
await page.fill('.chat-bar input', '¡Salud, vigilantes!')
await page.click('.chat-bar button')
await sleep(400)
await page.screenshot({ path: OUT + '/feat_chat.png' })

// Correr: activar y caminar; medir velocidad real (tiles/seg)
await page.evaluate(() => window.__vigiliaStoreState().toggleRun())
const p0 = await page.evaluate(() => ({ x: window.__vigilia.player.tx, y: window.__vigilia.player.ty, t: performance.now() }))
await page.mouse.click(360, 800)
await sleep(700)
const p1 = await page.evaluate(() => ({ x: window.__vigilia.player.tx, y: window.__vigilia.player.ty, t: performance.now() }))
const tilesPerSec = Math.hypot(p1.x-p0.x, p1.y-p0.y) / ((p1.t-p0.t)/1000)
await page.screenshot({ path: OUT + '/feat_run.png' })

console.log(JSON.stringify({ info, runTilesPerSec: +tilesPerSec.toFixed(2), errors }, null, 1))
await browser.close()
