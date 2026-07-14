// Pantalla de carga al entrar al juego (jugar o mirar): logo/título, una barra que se llena y
// una frase de lore. Nunca queda la pantalla en negro con un texto suelto.
import { useState } from 'react'
import { useT } from './useT.js'
import { LORE } from './ZoneLoader.jsx'

export default function GameLoader() {
  const t = useT()
  const lore = LORE[t.lang] || LORE.en
  const [line] = useState(() => lore[Math.floor(Math.random() * lore.length)])
  return (
    <div className="boot game-loader">
      <div className="boot-inner">
        <div className="loader-title">{t('entering_world')}</div>
        <div className="boot-bar"><i className="loop" /></div>
        <p className="loader-lore">“{line}”</p>
      </div>
    </div>
  )
}
