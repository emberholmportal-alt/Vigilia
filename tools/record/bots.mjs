// Spawner de jugadores de relleno para grabar la escena MULTIPLAYER del trailer.
// Conecta ~10 clientes por WebSocket (sin navegador) al servidor local y los hace pasear por
// Triston, cada uno con una raza y una armadura/arma distinta. Sólo para grabar clips: no toca
// nada del juego, sólo habla el protocolo normal (register/join/setgfx/move).
//
// Uso:
//   1) npm run dev        (cliente, en una terminal)
//   2) npm run server     (servidor autoritativo, en otra terminal)
//   3) node tools/record/bots.mjs        (esta, en otra terminal)
//   4) abrí  http://localhost:5173/record.html?scene=town  y grabá.
//   Ctrl+C para desconectar los bots.
//
// Opcional: node tools/record/bots.mjs ws://otro-host:8787   (por defecto ws://localhost:8787)

import { WebSocket } from 'ws'

const WS_URL = process.argv[2] || 'ws://localhost:8787'
const HUB = [59, 58] // tile de spawn de Triston (Game.js: HUB_SPAWN.triston)
const rnd = (n) => { let s = ''; for (let i = 0; i < n; i++) s += 'abcdef0123456789'[(Math.random() * 16) | 0]; return s }

// 10 jugadores: razas variadas (humano/elfo/enano/orco) y sets de armadura reales de Flare.
const BOTS = [
  ['Kaldûr',  'humano', 'male',   { head:'plate_helm',   chest:'plate_cuirass', legs:'plate_greaves',  feet:'plate_boots',  hands:'plate_gauntlets', main:'greatsword' }],
  ['Borin',   'enano',  'male',   { head:'chain_coif',   chest:'chain_cuirass', legs:'chain_greaves',  feet:'chain_boots',  hands:'chain_gloves', main:'longsword', off:'kite_shield' }],
  ['Lysenne', 'elfo',   'female', { head:'mage_hood',    chest:'mage_vest',     legs:'mage_skirt',     feet:'mage_boots',   hands:'mage_sleeves', main:'greatstaff' }],
  ['Faylen',  'elfo',   'male',   { head:'leather_hood', chest:'leather_chest', legs:'leather_pants',  feet:'leather_boots',hands:'leather_gloves', main:'shortsword', off:'buckler' }],
  ['Grushak', 'orco',   'male',   { chest:'plate_cuirass', legs:'plate_greaves', feet:'plate_boots',   main:'infantry_axe' }],
  ['Mira',    'humano', 'female', { head:'leather_hood', chest:'leather_chest', legs:'leather_pants',  feet:'leather_boots',main:'dagger', off:'iron_buckler' }],
  ['Durgan',  'enano',  'male',   { head:'plate_helm',   chest:'plate_cuirass', legs:'plate_greaves',  main:'smith_hammer', off:'shield' }],
  ['Ysolde',  'elfo',   'female', { head:'mage_hood_alt1', chest:'mage_vest_alt1', legs:'mage_skirt_alt1', feet:'mage_boots_alt1', main:'wand' }],
  ['Rok',     'orco',   'male',   { chest:'chain_cuirass', legs:'chain_greaves', feet:'chain_boots',   main:'zweihander' }],
  ['Aldric',  'humano', 'male',   { head:'chain_coif',   chest:'chain_cuirass', legs:'chain_greaves',  main:'club', off:'shield' }],
]

const conns = []
function spawn([name, race, body, gfx], i) {
  const ws = new WebSocket(WS_URL)
  let hx = HUB[0] + ((i % 4) - 2), hy = HUB[1] + (Math.floor(i / 4) - 1) * 2
  ws.on('open', () => ws.send(JSON.stringify({ t: 'register', user: 'rec_' + rnd(8), pass: rnd(12) })))
  ws.on('message', (d) => {
    let m; try { m = JSON.parse(d) } catch { return }
    if (m.t === 'auth' && m.ok) {
      ws.send(JSON.stringify({ t: 'join', name, race, body, map: 'triston', x: hx, y: hy, dir: 7 }))
      ws.send(JSON.stringify({ t: 'php', hp: 70, hpMax: 70 }))
      const sg = () => { try { ws.send(JSON.stringify({ t: 'setgfx', gfx })) } catch {} }
      sg(); setInterval(sg, 2000) // reenvía el equipo por si el que graba entra después
      // pasea suave cerca del centro del pueblo
      setInterval(() => {
        hx = Math.max(HUB[0] - 5, Math.min(HUB[0] + 5, hx + ((Math.random() * 3 | 0) - 1)))
        hy = Math.max(HUB[1] - 5, Math.min(HUB[1] + 5, hy + ((Math.random() * 3 | 0) - 1)))
        try { ws.send(JSON.stringify({ t: 'move', map: 'triston', x: hx, y: hy, dir: Math.random() * 8 | 0 })) } catch {}
      }, 900 + Math.random() * 500)
      console.log(`  ✓ ${name} (${race}) conectado`)
    }
  })
  ws.on('error', (e) => console.error(`  ✗ ${name}:`, e.message))
  conns.push(ws)
}

console.log(`Conectando ${BOTS.length} jugadores a ${WS_URL} ...`)
BOTS.forEach(spawn)
console.log('Listo. Abrí  http://localhost:5173/record.html?scene=town  y grabá. Ctrl+C para salir.')
process.on('SIGINT', () => { conns.forEach((w) => { try { w.close() } catch {} }); process.exit(0) })
