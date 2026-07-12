// Verifica el marcador X de destino y el movimiento suavizado.
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.SHOT_DIR || tmpdir()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.click('.enter'); await page.waitForSelector('.race'); await page.click('.race-inner .enter')
await page.waitForFunction(() => window.__vigilia?.player?.paperdoll)
await sleep(1000)

// Tap lejos para caminar; medir suavizado (waypoints del camino crudo vs suavizado).
const info = await page.evaluate(() => {
  const g = window.__vigilia
  // elegir un destino caminable lejano
  let dest=null
  for (let r=8;r<40&&!dest;r++) for(let a=0;a<8&&!dest;a++){
    const x=Math.round(g.player.tx+Math.cos(a)*r), y=Math.round(g.player.ty+Math.sin(a)*r)
    if (g.grid.isWalkable(x,y)) dest={x,y}
  }
  return dest
})
// disparar el walk vía el input real: tap LEJANO (arriba-derecha) y capturar rápido
await page.mouse.click(360, 170)
await sleep(180)
await page.screenshot({ path: OUT + '/move_marker.png' })

// muestrear colisión durante el trayecto
let violations=0, samples=0
for (let i=0;i<80;i++){
  await sleep(60)
  const s=await page.evaluate(()=>{const g=window.__vigilia;const tx=Math.round(g.player.tx),ty=Math.round(g.player.ty);return{blocked:g.grid.isBlocked(tx,ty),moving:g.player.moving}})
  samples++; if(s.blocked)violations++
  if(!s.moving)break
}
console.log(JSON.stringify({dest:info, violations, samples}, null, 1))
await browser.close()
if (violations>0){console.error('colisión violada con suavizado');process.exit(3)}
console.log('MOVE OK')
