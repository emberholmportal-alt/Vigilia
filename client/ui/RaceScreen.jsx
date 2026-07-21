// Selección de raza estilo Diablo II: char-select sobre el TOMO abierto de Flare.
// Cada raza es una carta con su retrato (arte de Flare); al elegirla se ilumina y la página
// derecha muestra el retrato grande, los modificadores y la frase de fantasía (WORLD.md).
import { useEffect, useRef, useState } from 'react'
import { RACES, HAIR_OPTIONS, normalizeHead } from '../data/characters.js'
import { useT } from './useT.js'
import Embers from './Embers.jsx'

// Retrato pintado de Flare por raza Y cuerpo (public/assets/portraits). Cada raza tiene su cara
// masculina y femenina (y una de piel oscura donde hay arte) para que el retrato acompañe la
// elección de cuerpo. El orco sólo tiene un retrato (goblin) en el arte de Flare.
const PORTRAIT = {
  humano: { male: 'male07', female: 'female01', female_dark: 'female13' },
  elfo:   { male: 'male09', female: 'female04' },
  enano:  { male: 'male16', female: 'female10' },
  orco:   { male: 'goblin', female: 'goblin' },
}
const BASE = import.meta.env.BASE_URL || '/'
const faceFile = (id, body) => {
  const p = PORTRAIT[id] || PORTRAIT.humano
  if (body === 'female_dark') return p.female_dark || p.female || p.male
  if (body === 'female') return p.female || p.male
  return p.male
}
const faceUrl = (id, body) => `${BASE}assets/portraits/${faceFile(id, body)}.png`

const BODIES = [
  { id: 'male', label: 'Hombre', label_en: 'Male' },
  { id: 'female', label: 'Mujer', label_en: 'Female' },
  { id: 'female_dark', label: 'Mujer (piel oscura)', label_en: 'Female (dark skin)' },
]

export default function RaceScreen({ onChoose, onBack }) {
  const [sel, setSel] = useState(RACES[0].id)
  const [name, setName] = useState('')
  const [body, setBody] = useState('male')
  const [head, setHead] = useState(() => normalizeHead(null, RACES[0].id, 'male'))
  const race = RACES.find((r) => r.id === sel)
  const hairOpts = HAIR_OPTIONS[body] || HAIR_OPTIONS.male
  // Al cambiar de RAZA, el peinado vuelve al canónico de esa raza (enano/orco pelados). Al cambiar
  // sólo el CUERPO, se mantiene la elección si sigue siendo válida (male↔female no la pierde).
  const prevSel = useRef(sel)
  useEffect(() => {
    if (prevSel.current !== sel) { prevSel.current = sel; setHead(normalizeHead(null, sel, body)) }
    else setHead((h) => normalizeHead(h, sel, body))
  }, [sel, body])
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
                <span className="race-face" style={{ backgroundImage: `url(${faceUrl(r.id, body)})` }} />
                <b>{rn(r)}</b>
                <span className="race-arch">{ar(r)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Página derecha: retrato grande + nombre + mods + fantasía + confirmar */}
        <div className="tome-page tome-right">
          <div className="race-hero">
            <span className="race-hero-face" style={{ backgroundImage: `url(${faceUrl(sel, body)})` }} />
            <div className="race-hero-name">{rn(race)}</div>
            <div className="race-hero-arch">{ar(race)}</div>
          </div>
          <div className="race-mods">{en ? (race.modText_en || race.modText) : race.modText}</div>
          <p className="race-fantasy">“{en ? (race.fantasy_en || race.fantasy) : race.fantasy}”</p>
          <div className="body-pick">
            {BODIES.map((b) => (
              <button key={b.id} className={'body-opt' + (b.id === body ? ' on' : '')} onClick={() => setBody(b.id)}>
                {en ? b.label_en : b.label}
              </button>
            ))}
          </div>
          {hairOpts.length > 1 && (
            <div className="body-pick hair-pick">
              {hairOpts.map((h) => (
                <button key={h.id} className={'body-opt' + (h.id === head ? ' on' : '')} onClick={() => setHead(h.id)}>
                  {en ? h.label_en : h.label}
                </button>
              ))}
            </div>
          )}
          <input
            className="name-input"
            placeholder={t('your_name')}
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="enter primary confirm" disabled={!name.trim()} onClick={() => onChoose(race.id, name.trim(), body, head)}>
            {name.trim() ? t('incarnate', { race: rn(race) }) : t('need_name')}
          </button>
        </div>
      </div>
    </div>
  )
}
