import { chromium } from 'playwright-core'
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT=process.env.SHOT_DIR||'/tmp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--mute-audio']})
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2})
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errs.push(m.text())})
await p.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'})
await p.click('.enter'); await p.waitForSelector('.race'); await p.fill('.name-input','Azrael'); await p.click('.race-inner .enter')
await p.waitForFunction(()=>window.__vigilia?.npcs?.length>0); await sleep(1800)
const info=await p.evaluate(()=>{const g=window.__vigilia; return {map:g.world.map.name, spawn:{x:Math.round(g.player.tx),y:Math.round(g.player.ty)}, npcs:g.npcs.length, particles:g.particles.container.children.length, emitters:g.particles.emitters.length}})
await p.screenshot({path:OUT+'/hub_lochport.png'})
// hablar con Guardia Bram -> caja de diálogo con retrato
await p.evaluate(()=>{const g=window.__vigilia; const n=g.npcs.find(n=>n.def.name==='Guardia Bram'); g._talkTo(n)})
await sleep(500)
await p.screenshot({path:OUT+'/dialogue.png'})
console.log(JSON.stringify({info,errs},null,1))
await b.close()
