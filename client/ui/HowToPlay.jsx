// Overlay "Cómo Jugar / How to Play" (desde el landing). Bilingüe, con el chrome estilo Flare
// (marco tallado, título dorado, X roja), coherente con Docs y los paneles del juego.
import { useGameStore } from '../store.js'
import { HOW_TO_PLAY } from '../data/guide.js'
import * as Icons from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const TITLE = { es: 'Cómo Jugar', en: 'How to Play' }
const SUB = { es: 'Lo que necesitás saber para no perderte en Velgrim.', en: 'What you need to know so you do not get lost in Velgrim.' }
const CLOSE = { es: 'Entendido', en: 'Got it' }

export default function HowToPlay({ onClose }) {
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setLang = useGameStore((s) => s.setLang)
  const sections = HOW_TO_PLAY[lang] || HOW_TO_PLAY.en

  return (
    <div className="gframe-backdrop" onClick={onClose}>
      <div className="gframe htp-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={onClose} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{TITLE[lang]}</h2>
            <p className="gframe-sub">{SUB[lang]}</p>
          </div>
          <div className="gframe-lang">
            <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>

        <div className="gframe-body htp-body">
          {sections.map((sec, i) => {
            const Ic = Icons[sec.icon] || Icons.Scroll
            return (
              <section className="htp-sec" key={i}>
                <div className="htp-sec-ic"><Ic /></div>
                <div className="htp-sec-txt">
                  <h3><span className="htp-num">{i + 1}</span>{sec.title}</h3>
                  {sec.body.map((p, j) => <p key={j}>{p}</p>)}
                  {sec.tip && <div className="docs-note tip"><span>✦</span><p>{sec.tip}</p></div>}
                  {sec.warn && <div className="docs-note warn"><span>!</span><p>{sec.warn}</p></div>}
                </div>
              </section>
            )
          })}
        </div>

        <button className="gframe-close" onClick={onClose}>{CLOSE[lang]}</button>
      </div>
    </div>
  )
}
