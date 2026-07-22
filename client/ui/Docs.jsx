// Overlay "Documentación / Docs": wiki con sidebar (grupos → temas) + contenido. Bilingüe,
// con el chrome estilo Flare (marco tallado, título dorado, X roja). Contenido en data/docs.js.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { DOCS } from '../data/docs.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const TITLE = { es: 'Documentación', en: 'Docs' }
const CLOSE = { es: 'Cerrar', en: 'Close' }

function Block({ b }) {
  if (b.h) return <h4 className="docs-h">{b.h}</h4>
  if (b.p) return <p className="docs-p">{b.p}</p>
  if (b.list) return <ul className="docs-list">{b.list.map((it, i) => <li key={i}>{it}</li>)}</ul>
  if (b.tip) return <div className="docs-note tip"><span>✦</span><p>{b.tip}</p></div>
  if (b.warn) return <div className="docs-note warn"><span>!</span><p>{b.warn}</p></div>
  if (b.table) return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead><tr>{b.table.cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{b.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  return null
}

export default function Docs({ onClose }) {
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setLang = useGameStore((s) => s.setLang)
  const groups = (DOCS[lang] || DOCS.en).groups
  const [sel, setSel] = useState('intro')

  // topic elegido (busca en todos los grupos)
  let topic = null
  for (const g of groups) { const t = g.topics.find((x) => x.id === sel); if (t) { topic = t; break } }
  if (!topic) topic = groups[0].topics[0]

  return (
    <div className="gframe-backdrop" onClick={onClose}>
      <div className="gframe docs-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={onClose} aria-label="close" />
        <div className="gframe-head">
          <h2 className="gframe-title">{TITLE[lang]}</h2>
          <div className="gframe-lang">
            <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>

        <div className="docs-layout">
          <nav className="docs-nav">
            {groups.map((g) => (
              <div className="docs-nav-group" key={g.title}>
                <div className="docs-nav-title">{g.title}</div>
                {g.topics.map((tp) => (
                  <button key={tp.id} className={'docs-nav-item' + (tp.id === sel ? ' on' : '')} onClick={() => setSel(tp.id)}>
                    {tp.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <article className="docs-article">
            <h3 className="docs-topic-title">{topic.title}</h3>
            {topic.blocks.map((b, i) => <Block key={i} b={b} />)}
          </article>
        </div>

        <button className="gframe-close" onClick={onClose}>{CLOSE[lang]}</button>
      </div>
    </div>
  )
}
