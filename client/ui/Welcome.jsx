// Modal de bienvenida (1 vez por personaje). Lo esencial para arrancar; abre la guía completa si
// querés más. Usa el chrome de gframe (marco tallado), coherente con HowToPlay / Docs.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import HowToPlay from './HowToPlay.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

const T = {
  es: {
    title: 'Bienvenido a Velgrim',
    sub: 'Lo esencial para no perderte. La guía completa está a un toque.',
    items: [
      ['Moverte', 'Tocá el suelo para caminar; tocá un portal o waypoint para viajar entre zonas.'],
      ['Combatir', 'Tocá un enemigo para atacarlo y usá tus habilidades de la barra de acción.'],
      ['Curarte', 'Mandá pociones al cinturón y tocalas en combate para recuperar vida y maná.'],
      ['Misiones', 'Tenés 3 diarias: cumplilas para ganar oro, XP y fragmentos de sello.'],
      ['Volver al pueblo', 'Usá el Pergamino de Retorno o el Obelisco para volver a Triston.'],
      ['Tu carga', 'Si morís, dejás parte del oro y tu bolsa en una tumba: volvé a buscarla.'],
    ],
    guide: 'Guía completa',
    close: 'Empezar',
  },
  en: {
    title: 'Welcome to Velgrim',
    sub: "The essentials so you don't get lost. The full guide is one tap away.",
    items: [
      ['Move', 'Tap the ground to walk; tap a portal or waypoint to travel between zones.'],
      ['Fight', 'Tap an enemy to attack it and use your abilities from the action bar.'],
      ['Heal', 'Send potions to your belt and tap them in combat to restore health and mana.'],
      ['Quests', 'You have 3 daily quests: complete them for gold, XP and seal fragments.'],
      ['Back to town', 'Use the Recall Scroll or the Obelisk to return to Triston.'],
      ['Your load', 'If you die, you drop some gold and your bag in a grave: go get it back.'],
    ],
    guide: 'Full guide',
    close: 'Start',
  },
}

export default function Welcome() {
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setLang = useGameStore((s) => s.setLang)
  const dismiss = useGameStore((s) => s.dismissWelcome)
  const [guide, setGuide] = useState(false)
  const c = T[lang] || T.en

  if (guide) return <HowToPlay onClose={() => setGuide(false)} />

  return (
    <div className="gframe-backdrop" onClick={dismiss}>
      <div className="gframe welcome-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={dismiss} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{c.title}</h2>
            <p className="gframe-sub">{c.sub}</p>
          </div>
          <div className="gframe-lang">
            <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>

        <div className="gframe-body welcome-body">
          <ul className="welcome-list">
            {c.items.map(([h, p], i) => (
              <li key={i}><span className="welcome-num">{i + 1}</span><span><b>{h}.</b> {p}</span></li>
            ))}
          </ul>
        </div>

        <div className="welcome-actions">
          <button className="welcome-guide" onClick={() => setGuide(true)}>{c.guide}</button>
          <button className="gframe-close" onClick={dismiss}>{c.close}</button>
        </div>
      </div>
    </div>
  )
}
