// Overlay "Documentación / Docs": referencia profunda por categorías (El Mundo, Razas,
// Escenarios, Sistemas, Economía, Roadmap). Bilingüe (toggle propio), estética del juego.
// Contenido en data/docs.js. Reusa el marco visual de How to Play (.htp-*).
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { DOCS } from '../data/docs.js'
import * as Icons from './Icon.jsx'

const TITLE = { es: 'Documentación', en: 'Docs' }
const SUB = { es: 'El mundo de Velgrim y sus reglas, en detalle.', en: 'The world of Velgrim and its rules, in detail.' }
const CLOSE = { es: 'Cerrar', en: 'Close' }

function Block({ b }) {
  if (b.h) return <h4 className="docs-h">{b.h}</h4>
  if (b.p) return <p className="docs-p">{b.p}</p>
  if (b.list) return <ul className="docs-list">{b.list.map((it, i) => <li key={i}>{it}</li>)}</ul>
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
  const cats = DOCS[lang] || DOCS.en
  const [sel, setSel] = useState(0)
  const cat = cats[Math.min(sel, cats.length - 1)]

  return (
    <div className="htp-backdrop" onClick={onClose}>
      <div className="htp-panel docs-panel" onClick={(e) => e.stopPropagation()}>
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

        <div className="docs-tabs">
          {cats.map((c, i) => {
            const Ic = Icons[c.icon] || Icons.Scroll
            return (
              <button key={c.id} className={'docs-tab' + (i === sel ? ' on' : '')} onClick={() => setSel(i)}>
                <Ic /> <span>{c.title}</span>
              </button>
            )
          })}
        </div>

        <div className="htp-body docs-content">
          {cat.blocks.map((b, i) => <Block key={i} b={b} />)}
        </div>

        <button className="htp-close" onClick={onClose}>{CLOSE[lang]}</button>
      </div>
    </div>
  )
}
