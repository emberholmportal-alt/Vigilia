// Screenshot de un mapa en su centro abierto, para elegir el mapa inicial.
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.SHOT_DIR || tmpdir()
const map = process.argv[2] || 'black_oak_city'
const cx = +(process.argv[3] || 50), cy = +(process.argv[4] || 50)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
await page.goto('http://127.0.0.1:5173/?map=' + map, { waitUntil: 'networkidle' })
await page.click('.enter'); await page.waitForSelector('.race'); await page.click('.race-inner .enter')
await page.waitForFunction(() => window.__vigilia?.player?.paperdoll, { timeout: 20000 })
await page.evaluate(({cx,cy}) => {
  const g=window.__vigilia
  const s=g.grid.nearestWalkable(cx,cy,40)||{x:cx,y:cy}
  g.player.tx=s.x; g.player.ty=s.y; g.player.path=[]; g.player.moving=false
  g.camera.follow(s.x,s.y); g.camera.snap()
}, {cx,cy})
await sleep(900)
await page.screenshot({ path: `${OUT}/map_${map}.png` })
console.log('shot', map)
await browser.close()
