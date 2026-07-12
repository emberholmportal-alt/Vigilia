// Captura HUD, inventario modal y una secuencia de movimiento (para ver naturalidad).
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
await page.click('.enter'); await page.waitForSelector('.race'); await page.click('.race-card:nth-child(3)'); await page.click('.race-inner .enter')
await page.waitForFunction(() => window.__vigilia?.player?.paperdoll)
await sleep(1200)

// mover a un tile despejado para que no lo tape un árbol
await page.evaluate(() => {
  const g = window.__vigilia
  // buscar tile caminable con pocos objetos alrededor
  let best=null,bs=1e9
  for (let r=2;r<14;r++) for(let a=0;a<12;a++){
    const x=Math.round(g.player.tx+Math.cos(a)*r), y=Math.round(g.player.ty+Math.sin(a)*r)
    if(!g.grid.isWalkable(x,y))continue
    let objs=0; for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=(y+dy)*g.world.map.w+(x+dx); if(g.renderer.obj[i])objs++}
    if(objs<bs){bs=objs;best={x,y}}
  }
  if(best){g.player.tx=best.x;g.player.ty=best.y;g.camera.follow(best.x,best.y);g.camera.snap()}
})
await sleep(400)
await page.screenshot({ path: OUT + '/hud.png' })

// Inventario modal
await page.click('.ab-menu[title="Inventario"]')
await page.waitForSelector('.modal', { timeout: 5000 })
await sleep(300)
await page.screenshot({ path: OUT + '/inv_modal.png' })
await page.click('.close-btn')
await sleep(200)

// Correr + secuencia de movimiento
await page.evaluate(() => window.__vigiliaStoreState().toggleRun())
await page.mouse.click(360, 780) // caminar hacia abajo
const frames=[]
for (let i=0;i<4;i++){ await sleep(200); await page.screenshot({ path: `${OUT}/walk_${i}.png` }); }

console.log(JSON.stringify({ errors }, null, 1))
await browser.close()
