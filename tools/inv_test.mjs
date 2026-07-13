import { chromium } from 'playwright-core'
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT=process.env.SHOT_DIR||'/tmp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--mute-audio']})
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2})
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errs.push(m.text())})
await p.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'})
await p.click('.enter'); await p.waitForSelector('.race'); await p.click('.race-card:nth-child(3)'); await p.click('.race-inner .enter')
await p.waitForFunction(()=>window.__vigilia?.player?.paperdoll); await sleep(1200)
await p.click('.ab-btn[title="Inventario"]'); await p.waitForSelector('.flare-panel'); await sleep(300)
// click en la primera celda con ícono (un ítem de la grilla)
const cells=await p.$$('.inv-cell')
for (const c of cells){ if(await c.$('.item-icon')){ await c.click(); break } }
await sleep(300)
const hasTip=await p.$('.inv-tooltip')?true:false
await p.screenshot({path:OUT+'/inv_flare.png'})
console.log(JSON.stringify({hasTooltip:!!(await p.$('.inv-tooltip')),errs},null,1))
await b.close()
