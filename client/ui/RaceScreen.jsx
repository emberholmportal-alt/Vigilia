// Selección de raza. Los modificadores y la fantasía salen de docs/WORLD.md.
import { useState } from 'react'
import { RACES } from '../data/characters.js'
import { useT } from './useT.js'

export default function RaceScreen({ onChoose }) {
  const [sel, setSel] = useState(RACES[0].id)
  const [name, setName] = useState('')
  const race = RACES.find((r) => r.id === sel)
  const t = useT()
  const en = t.lang === 'en'
  const rn = (r) => (en ? (r.name_en || r.name) : r.name)

  return (
    <div className="race">
      <div className="race-inner">
        <h2>{t('race_title')}</h2>
        <input
          className="name-input"
          placeholder={t('your_name')}
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="race-grid">
          {RACES.map((r) => (
            <button
              key={r.id}
              className={'race-card' + (r.id === sel ? ' on' : '')}
              onClick={() => setSel(r.id)}
            >
              <b>{rn(r)}</b>
              <span>{en ? (r.archetype_en || r.archetype) : r.archetype}</span>
            </button>
          ))}
        </div>
        <div className="race-detail">
          <div className="race-mods">{en ? (race.modText_en || race.modText) : race.modText}</div>
          <p className="race-fantasy">“{en ? (race.fantasy_en || race.fantasy) : race.fantasy}”</p>
        </div>
        <button className="enter" disabled={!name.trim()} onClick={() => onChoose(race.id, name.trim())}>
          {name.trim() ? t('incarnate', { race: rn(race) }) : t('need_name')}
        </button>
      </div>
    </div>
  )
}
