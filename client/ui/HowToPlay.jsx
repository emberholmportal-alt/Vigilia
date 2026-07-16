// Overlay "Cómo Jugar / How to Play" que se abre desde la pantalla de inicio. Bilingüe (toggle
// ES/EN propio), estética del juego (pergamino oscuro + oro/brasa). Contenido en data/guide.js.
import { useGameStore } from '../store.js'
import { HOW_TO_PLAY } from '../data/guide.js'
import * as Icons from './Icon.jsx'

const TITLE = { es: 'Cómo Jugar', en: 'How to Play' }
const SUB = { es: 'Lo que necesitás saber para no perderte en Velgrim.', en: 'What you need to know so you do not get lost in Velgrim.' }
const CLOSE = { es: 'Entendido', en: 'Got it' }

export default function HowToPlay({ onClose }) {
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setLang = useGameStore((s) => s.setLang)
  const sections = HOW_TO_PLAY[lang] || HOW_TO_PLAY.en

  return (
    <div className="htp-backdrop" onClick={onClose}>
      <div className="htp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="htp-head">
          <div className="htp-titles">
            <h2>{TITLE[lang]}</h2>
            <p>{SUB[lang]}</p>
          </div>
          <div className="htp-lang">
            <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>

        <div className="htp-body">
          {sections.map((sec, i) => {
            const Ic = Icons[sec.icon] || Icons.Scroll
            return (
              <section className="htp-sec" key={i}>
                <div className="htp-sec-ic"><Ic /></div>
                <div className="htp-sec-txt">
                  <h3><span className="htp-num">{i + 1}</span>{sec.title}</h3>
                  {sec.body.map((p, j) => <p key={j}>{p}</p>)}
                </div>
              </section>
            )
          })}
        </div>

        <button className="htp-close" onClick={onClose}>{CLOSE[lang]}</button>
      </div>
    </div>
  )
}
