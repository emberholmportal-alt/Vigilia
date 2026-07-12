import { chromium } from 'playwright-core'
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT=process.env.SHOT_DIR||'/tmp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--mute-audio']})
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2})
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errs.push(m.text())})
// limpiar cualquier save previo
await p.goto('http://127.0.0.1:5173/?map=lochport',{waitUntil:'networkidle'})
await p.evaluate(()=>localStorage.removeItem('vigilia:save:v1'))
await p.reload({waitUntil:'networkidle'})
await p.click('.enter'); await p.waitForSelector('.race')
await p.fill('.name-input','Grimwald'); await p.click('.race-card:nth-child(1)'); await p.click('.race-inner .enter')
await p.waitForFunction(()=>window.__vigilia?.player?.paperdoll); await sleep(1000)
// abrir varios cofres para ganar XP de Saqueo
const gained = await p.evaluate(async ()=>{
  const g=window.__vigilia, S=window.__vigiliaStoreState
  const xp0=S().xp, sk0=S().skills.saqueo.xp
  for(let k=0;k<8;k++){ g.chests.forEach(c=>{c.opened=false; g._openChest(c)}) }
  return { xp0, xp1:S().xp, saqueo0:sk0, saqueo1:S().skills.saqueo, playerLevel:S().stats.level, name:S().playerName }
})
// verificar que se guardo
const saved = await p.evaluate(()=>!!localStorage.getItem('vigilia:save:v1'))
const snapshot = await p.evaluate(()=>JSON.parse(localStorage.getItem('vigilia:save:v1')))
// RELOAD y Continuar
await p.reload({waitUntil:'networkidle'})
await sleep(300)
const canContinue = await p.$('text=Continuar')?true:false
await p.click('text=Continuar')
await p.waitForFunction(()=>window.__vigilia?.player?.paperdoll); await sleep(800)
const restored = await p.evaluate(()=>{ const S=window.__vigiliaStoreState(); return {xp:S.xp, saqueo:S.skills.saqueo, name:S.playerName, gold:S.gold, level:S.stats.level} })
// nombre con nivel sobre la cabeza
const nameText = await p.evaluate(()=>window.__vigilia.player.nameText.text)
console.log(JSON.stringify({gained, saved, savedName:snapshot.playerName, savedXp:snapshot.xp, canContinue, restored, nameText, errs},null,1))
await b.close()
