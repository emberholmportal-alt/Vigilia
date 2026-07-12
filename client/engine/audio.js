// Música de fondo (Flare, CC-BY-SA). Un solo track a la vez, en loop. Los navegadores
// exigen un gesto del usuario para arrancar audio, así que se llama desde los clicks.
const BASE = (import.meta.env.BASE_URL || '/') + 'assets/audio/'
const VOLUME = 0.45

let current = null
let currentName = ''
let muted = false

export function playMusic(file) {
  if (currentName === file && current) return
  stopMusic()
  currentName = file
  const a = new Audio(BASE + file)
  a.loop = true
  a.volume = muted ? 0 : VOLUME
  a.play().catch(() => {}) // si el navegador lo bloquea, se reintenta en el próximo gesto
  current = a
}

export function stopMusic() {
  if (current) { current.pause(); current = null; currentName = '' }
}

export function setMuted(m) {
  muted = m
  if (current) current.volume = m ? 0 : VOLUME
}

export function isMuted() { return muted }

// Efecto de sonido de una sola vez (loot, cofres). Vive en assets/audio/sfx/.
const SFX_VOLUME = 0.6
export function playSfx(file) {
  if (muted) return
  const a = new Audio(BASE + 'sfx/' + file)
  a.volume = SFX_VOLUME
  a.play().catch(() => {})
}
