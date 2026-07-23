// Helper para grabar la escena del MINOTAURO sin caminar 29 tiles.
// Mueve temporalmente el spawner del minotauro (categoría minotaur_necromancer) en
// public/maps/black_oak_farm.json cerca del spawn del jugador y le baja el nivel para
// que la pelea dure y sea ganable. SIEMPRE revertí al terminar (deja el mapa como estaba).
//
// Uso:
//   node tools/record/minotaur_near.mjs on            -> lo acerca a (64,66), nivel 4
//   node tools/record/minotaur_near.mjs on 66 70 5    -> posición y nivel a gusto
//   node tools/record/minotaur_near.mjs off           -> revierte al original (69,81), nivel 10
//
// Nota: el juego suprime spawns muy pegados al jugador (zona segura ~pocos tiles). Si a esa
// distancia no aparece, probá una un poco más lejos, o revertí con `off` y caminá hasta (69,81).

import { readFileSync, writeFileSync } from 'node:fs'

const MAP = new URL('../../public/maps/black_oak_farm.json', import.meta.url)
const ORIGINAL = { x: 69, y: 81, level: [10, 10] } // valores canónicos del repo

const mode = process.argv[2] || 'on'
const d = JSON.parse(readFileSync(MAP, 'utf8'))
const sp = (d.spawners || []).find((s) => s.category === 'minotaur_necromancer')
if (!sp) { console.error('No encontré el spawner del minotauro en black_oak_farm.json'); process.exit(1) }

if (mode === 'off') {
  sp.x = ORIGINAL.x; sp.y = ORIGINAL.y; sp.level = [...ORIGINAL.level]
  writeFileSync(MAP, JSON.stringify(d))
  console.log(`Revertido: minotauro en (${sp.x},${sp.y}), nivel ${sp.level[0]}. El mapa quedó como el original.`)
} else {
  const x = +(process.argv[3] ?? 64), y = +(process.argv[4] ?? 66), lvl = +(process.argv[5] ?? 4)
  sp.x = x; sp.y = y; sp.level = [lvl, lvl]
  writeFileSync(MAP, JSON.stringify(d))
  console.log(`Minotauro movido a (${x},${y}), nivel ${lvl}. Recargá el juego, entrá a black_oak_farm y peleá.`)
  console.log('IMPORTANTE: al terminar de grabar, revertí con:  node tools/record/minotaur_near.mjs off')
}
