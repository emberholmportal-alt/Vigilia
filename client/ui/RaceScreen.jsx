// Selección de raza estilo Diablo II: char-select sobre el TOMO abierto de Flare.
// Cada raza es una carta con su retrato (arte de Flare); al elegirla se ilumina y la página
// derecha muestra el retrato grande, los modificadores y la frase de fantasía (WORLD.md).
import { useState } from 'react'
import { RACES } from '../data/characters.js'
import { useT } from './useT.js'
import Embers from './Embers.jsx'

// Retrato pintado de Flare por raza (public/assets/portraits). Elegidos por arquetipo.
const PORTRAIT = { humano: 'male07', elfo: 'female04', enano: 'male16', orco: 'goblin' }
const BASE = import.meta.env.BASE_URL || '/'
const faceUrl = (id) => `${BASE}assets/portraits/${PORTRAIT[id] || 'male01'}.png`

export default function RaceScreen({ onChoose, onBack }) {
  const [sel, setSel] = useState(RACES[0].id)
  const [name, setName] = useState('')
  const race = RACES.find((r) => r.id === sel)
  const t = useT()
  const en = t.lang === 'en'
  const rn = (r) => (en ? (r.name_en || r.name) : r.name)
  const ar = (r) => (en ? (r.archetype_en || r.archetype) : r.archetype)

  return (
    <div className="race menu-scene">
      <Embers />
      {onBack && <button className="menu-back" onClick={onBack}>‹ {t('back')}</button>}
      <div className="tome">
        {/* Página izquierda: las cuatro sangres */}
        <div className="tome-page tome-left">
          <h2 className="tome-title">{t('race_title')}</h2>
          <div className="race-grid">
            {RACES.map((r) => (
              <button
                key={r.id}
                className={'race-card' + (r.id === sel ? ' on' : '')}
                onClick={() => setSel(r.id)}
              >
                <span className="race-face" style={{ backgroundImage: `url(${faceUrl(r.id)})` }} />
                <b>{rn(r)}</b>
                <span className="race-arch">{ar(r)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Página derecha: retrato grande + nombre + mods + fantasía + confirmar */}
        <div className="tome-page tome-right">
          <div className="race-hero">
            <span className="race-hero-face" style={{ backgroundImage: `url(${faceUrl(sel)})` }} />
            <div className="race-hero-name">{rn(race)}</div>
            <div className="race-hero-arch">{ar(race)}</div>
          </div>
          <div className="race-mods">{en ? (race.modText_en || race.modText) : race.modText}</div>
          <p className="race-fantasy">“{en ? (race.fantasy_en || race.fantasy) : race.fantasy}”</p>
          <input
            className="name-input"
            placeholder={t('your_name')}
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="enter primary confirm" disabled={!name.trim()} onClick={() => onChoose(race.id, name.trim())}>
            {name.trim() ? t('incarnate', { race: rn(race) }) : t('need_name')}
          </button>
        </div>
      </div>
    </div>
  )
}
