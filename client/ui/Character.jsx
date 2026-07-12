// Hoja de personaje con el panel REAL de Flare (menus/character.png) y las
// coordenadas de menus/character.txt. Nombre, nivel, los 4 atributos en sus casillas
// (con los íconos ya dibujados: espada/vara/flechas/escudo) y una lista de derivados.
import { useGameStore } from '../store.js'
import { SKILLS, SKILL_LABEL, SKILL_CAP, playerProgress } from '../data/progression.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

// % del panel para posicionar texto (x,y en coords de Flare).
const at = (x, y) => ({ left: (x / PW * 100) + '%', top: (y / PH * 100) + '%' })

// Atributos primarios sobre las 4 casillas con ícono (físico/mental/ofensiva/defensa).
// Mapeamos nuestras FUE/INT/DES/VIT a esas casillas (mismo orden de íconos).
const PRIMARIES = [
  { key: 'str', label: 'Fuerza', abbr: 'FUE', y: 110 },
  { key: 'int', label: 'Inteligencia', abbr: 'INT', y: 154 },
  { key: 'dex', label: 'Destreza', abbr: 'DES', y: 198 },
  { key: 'vit', label: 'Vitalidad', abbr: 'VIT', y: 242 },
]

export default function Character() {
  const playerName = useGameStore((s) => s.playerName)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const xp = useGameStore((s) => s.xp)
  const skills = useGameStore((s) => s.skills)
  const setPanel = useGameStore((s) => s.setPanel)
  const s = stats || {}
  const prog = playerProgress(xp || 0)

  // Derivados que mostramos en la lista (statlist arranca en 16,296).
  const derived = [
    ['Vida', `${s.hp}/${s.hpMax}`],
    ['Maná', `${s.mp}/${s.mpMax}`],
    ['Aguante', s.staminaMax],
    ['Daño', s.dmgMul ? `×${s.dmgMul}` : '×1'],
    ['Velocidad', s.speedMul ? `×${s.speedMul}` : '×1'],
    ['Bonus XP', s.xpMul ? `×${s.xpMul}` : '×1'],
  ]

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}character.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        <div className="char-title" style={at(320, 24)}>Personaje</div>

        {/* nombre y nivel en sus casillas */}
        <div className="char-name" style={at(288, 80)}>{playerName}{race ? ` · ${race.name}` : ''}</div>
        <div className="char-level" style={at(592, 80)}>{s.level ?? 1}</div>

        {/* atributos primarios: valor en la casilla + nombre a la derecha del ícono */}
        {PRIMARIES.map((p) => (
          <div key={p.key}>
            <div className="char-primary-val" style={at(192, p.y + 14)}>{s[p.key] ?? 0}</div>
            <div className="char-primary-lbl" style={at(300, p.y + 14)}>{p.label} <em>{p.abbr}</em></div>
          </div>
        ))}

        {/* sección inferior: fluye verticalmente (el texto tiene alto fijo en px, así que
            posicionar cada bloque en % del panel se solapa; mejor apilarlos en un contenedor). */}
        <div className="char-lower">
          <div className="char-xp">
            <div className="char-xp-bar"><i style={{ width: `${Math.round(prog.pct * 100)}%` }} /></div>
            <span>XP {prog.into}/{prog.need}</span>
          </div>

          <div className="char-stats">
            {derived.map(([k, v]) => (
              <div className="char-stat" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>

          <div className="char-skills">
            <div className="char-skills-h">Acciones</div>
            {SKILLS.map((k) => {
              const sk = (skills && skills[k]) || { level: 1 }
              return (
                <div className="char-stat" key={k}>
                  <span>{SKILL_LABEL[k]}</span><b>Nv {sk.level}<em>/{SKILL_CAP}</em></b>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
