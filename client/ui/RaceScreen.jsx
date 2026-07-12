// Selección de raza. Los modificadores y la fantasía salen de docs/WORLD.md.
import { useState } from 'react'
import { RACES } from '../data/characters.js'

export default function RaceScreen({ onChoose }) {
  const [sel, setSel] = useState(RACES[0].id)
  const [name, setName] = useState('')
  const race = RACES.find((r) => r.id === sel)

  return (
    <div className="race">
      <div className="race-inner">
        <h2>Elegí tu sangre</h2>
        <input
          className="name-input"
          placeholder="Tu nombre"
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
              <b>{r.name}</b>
              <span>{r.archetype}</span>
            </button>
          ))}
        </div>
        <div className="race-detail">
          <div className="race-mods">{race.modText}</div>
          <p className="race-fantasy">“{race.fantasy}”</p>
        </div>
        <button className="enter" onClick={() => onChoose(race.id, name.trim())}>
          Encarnar {race.name}
        </button>
      </div>
    </div>
  )
}
