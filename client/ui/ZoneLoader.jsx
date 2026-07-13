// Pantalla de carga entre zonas: cortina temática (piedra oscura + runas violetas, como el
// portal) con una barra que se llena y una frase de lore. Nunca queda la pantalla en negro.
// La activa el loop vía store.zoneLoad = { label }.
import { useEffect, useState } from 'react'
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

// Frases de lore del mundo (dark fantasy). Se elige una al azar por viaje.
const LORE = {
  es: [
    'Los caminos entre zonas los abrieron los primeros Vigilantes, y no todos volvieron.',
    'Dicen que la piedra de los obeliscos recuerda cada nombre que la tocó.',
    'Bajo Black Oak City hay más túneles que calles sobre ella.',
    'El acero se cansa como los hombres: repáralo antes de que se quiebre.',
    'En la Ciénaga de Merrimead, la niebla devuelve los pasos que das.',
    'Los duendes no cavan por oro: cavan buscando algo que enterraron sus abuelos.',
    'Las minas cantan cuando el aire baja. No es el viento.',
    'Un arquero muerto sigue apuntando: no le des la espalda a un esqueleto.',
    'La luz de un Pergamino de Retorno es breve. Usalo antes de que la oscuridad la beba.',
    'Perdición no es un lugar; es lo que le pasa a quien se queda de más.',
    'Cada zona más honda cobra un peaje distinto: primero el oro, después el nombre.',
    'El Obelisco de Triston sólo despierta si alguien allá afuera lo llama.',
  ],
  en: [
    'The roads between zones were opened by the first Watchers, and not all came back.',
    'They say the obelisks remember every name that ever touched their stone.',
    'Beneath Black Oak City there are more tunnels than streets above it.',
    'Steel tires like men do: repair it before it snaps.',
    'In Merrimead Swamp, the mist gives back the steps you take.',
    "Goblins don't dig for gold: they dig for what their grandfathers buried.",
    'The mines sing when the air drops. It is not the wind.',
    'A dead archer keeps aiming: never turn your back on a skeleton.',
    "A Return Scroll's light is brief. Use it before the dark drinks it.",
    'Perdition is not a place; it is what happens to those who linger.',
    'Each deeper zone charges a different toll: first your gold, then your name.',
    "Triston's Obelisk only wakes if someone out there calls it.",
  ],
}

export default function ZoneLoader() {
  const zone = useGameStore((s) => s.zoneLoad)
  const t = useT()
  const pool = LORE[t.lang] || LORE.es
  const [phrase, setPhrase] = useState(pool[0])
  // Nueva frase cada vez que arranca un viaje (en el idioma actual).
  useEffect(() => {
    if (zone) { const p = LORE[t.lang] || LORE.es; setPhrase(p[Math.floor(Math.random() * p.length)]) }
  }, [!!zone, t.lang])
  if (!zone) return null
  const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
  return (
    <div className="modal-backdrop zoneload-backdrop">
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}>
        <div className="zoneload-inner">
          <div className="zoneload-title">{t('traveling_to')}</div>
          <div className="zoneload-rune" />
          <div className="zoneload-zone">{zone.label}</div>
          <div className="zoneload-bar"><div className="zoneload-fill" /></div>
          <p className="zoneload-lore">“{phrase}”</p>
        </div>
      </div>
    </div>
  )
}
