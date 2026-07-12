import { chromium } from 'playwright-core'
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT=process.env.SHOT_DIR||'/tmp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--mute-audio']})
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2})
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errs.push(m.text())})
await p.goto('http://127.0.0.1:5173/?map=lochport',{waitUntil:'networkidle'})
await p.click('.enter'); await p.waitForSelector('.race'); await p.click('.race-card:nth-child(1)'); await p.click('.race-inner .enter')
await p.waitForFunction(()=>window.__vigilia?.player?.paperdoll); await sleep(1200)

const res = await p.evaluate(async () => {
  const S = window.__vigiliaStoreState
  const g = window.__vigilia
  const qty = () => S().inventory.reduce((a,it)=>a+(it?(it.count||1):0),0)
  const goldBefore = S().gold, qtyBefore = qty()
  // abrir cofres hasta tener al menos un item en el suelo
  let tries=0
  do { g.chests.forEach(c=>{ c.opened=false; if(c.glow===null){/*recreate skip*/} }); g.chests.forEach(c=>g._openChest(c)); tries++ }
  while (g.groundItems.length===0 && tries<25)
  const goldAfterOpen = S().gold
  const dropped = g.groundItems.length
  // teletransportar al jugador sobre el primer item y esperar el auto-pickup
  const gi = g.groundItems[0]
  let picked=false
  if (gi){ g.player.tx=gi.tx; g.player.ty=gi.ty; g.player.moving=false }
  return { goldBefore, goldAfterOpen, qtyBefore, dropped, chestCount: g.chests.length, giTile: gi?[gi.tx,gi.ty]:null }
})
await sleep(700) // que el tick recoja
const after = await p.evaluate(() => {
  const S = window.__vigiliaStoreState
  const g = window.__vigilia
  const qty = () => S().inventory.reduce((a,it)=>a+(it?(it.count||1):0),0)
  return { qtyAfter: qty(), remaining: g.groundItems.length, gold: S().gold }
})
console.log(JSON.stringify({...res, ...after, errs}, null, 1))
await b.close()
