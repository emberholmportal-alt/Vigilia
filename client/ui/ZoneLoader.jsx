// Pantalla de carga entre zonas: cortina temática (piedra oscura + runas violetas, como el
// portal) con una barra que se llena y una frase de lore. Nunca queda la pantalla en negro.
// La activa el loop vía store.zoneLoad = { label }.
import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store.js'

// Frases de lore del mundo (dark fantasy rioplatense neutro). Se elige una al azar por viaje.
const LORE = [
  'Los caminos entre zonas los abrieron los primeros Vigilantes, y no todos volvieron.',
  'Dicen que la piedra de los obeliscos recuerda cada nombre que la tocó.',
  'Bajo Black Oak City hay más túneles que calles sobre ella.',
  'El acero se cansa como los hombres: repáralo antes de que se quiebre.',
  'En la Ciénaga de Merrimead, la niebla devuelve los pasos que das.',
  'Los duendes no cavan por oro: cavan buscando algo que enterraron sus abuelos.',
  'Las minas cantan cuando el aire baja. No es el viento.',
  'Un arquero muerto sigue apuntando: no le des la espalda a un esqueleto.',
  'La luz de una Piedra de Retorno es breve. Usala antes de que la oscuridad la beba.',
  'Perdición no es un lugar; es lo que le pasa a quien se queda de más.',
  'Cada zona más honda cobra un peaje distinto: primero el oro, después el nombre.',
  'El Obelisco de Triston sólo despierta si alguien allá afuera lo llama.',
]

export default function ZoneLoader() {
  const zone = useGameStore((s) => s.zoneLoad)
  const [phrase, setPhrase] = useState(LORE[0])
  // Nueva frase cada vez que arranca un viaje.
  useEffect(() => {
    if (zone) setPhrase(LORE[Math.floor(Math.random() * LORE.length)])
  }, [!!zone])
  if (!zone) return null
  return (
    <div className="zoneload">
      <div className="zoneload-inner">
        <div className="zoneload-rune" />
        <div className="zoneload-title">Viajando a</div>
        <div className="zoneload-zone">{zone.label}</div>
        <div className="zoneload-bar"><div className="zoneload-fill" /></div>
        <p className="zoneload-lore">“{phrase}”</p>
      </div>
    </div>
  )
}
