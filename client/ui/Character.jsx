// Hoja de personaje con el panel REAL de Flare (menus/character.png) y las
// coordenadas de menus/character.txt. Nombre, nivel, los 4 atributos en sus casillas
// (con los íconos ya dibujados: espada/vara/flechas/escudo) y una lista de derivados.
import { useGameStore } from '../store.js'
import { playerProgress } from '../data/progression.js'
import { attrEarned, attrSpent } from '../data/skilltree.js'
import { useT } from './useT.js'
import { raceName } from '../i18n.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

// % del panel para posicionar texto (x,y en coords de Flare).
const at = (x, y) => ({ left: (x / PW * 100) + '%', top: (y / PH * 100) + '%' })

// Atributos primarios sobre las 4 casillas con ícono (físico/mental/ofensiva/defensa).
const PRIMARIES = [
  { key: 'str', y: 110 }, { key: 'int', y: 154 }, { key: 'dex', y: 198 }, { key: 'vit', y: 242 },
]

export default function Character() {
  const playerName = useGameStore((s) => s.playerName)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const xp = useGameStore((s) => s.xp)
  const attrAlloc = useGameStore((s) => s.attrAlloc)
  const allocAttr = useGameStore((s) => s.allocAttr)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const s = stats || {}
  const prog = playerProgress(xp || 0)
  // Puntos de atributo disponibles (se reparten con el botón "+" de cada atributo).
  const attrPts = attrEarned(s.level || 1) - attrSpent(attrAlloc)

  // Derivados que mostramos en la lista (reflejan raza/nivel + equipo).
  const derived = [
    [t('stat_hp'), `${s.hp}/${s.hpMax}`],
    [t('stat_mp'), `${s.mp}/${s.mpMax}`],
    [t('stat_dmg'), s.dmgMin != null ? `${s.dmgMin}–${s.dmgMax}` : '—'],
    [t('stat_def'), s.defense || 0],
    ...(s.crit ? [[t('stat_crit'), `${s.crit}%`]] : []),
    ...(s.hpRegen ? [[t('stat_hpregen'), `${s.hpRegen}/s`]] : []),
    [t('stat_speed'), s.speedMul ? `×${s.speedMul}` : '×1'],
    [t('stat_xpbonus'), s.xpMul ? `×${s.xpMul.toFixed(2)}` : '×1'],
  ]

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}character.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        <div className="char-title" style={at(320, 24)}>{t('char_title')}</div>

        {/* nombre y nivel en sus casillas */}
        <div className="char-name" style={at(288, 80)}>{playerName}{race ? ` · ${raceName(race, t.lang)}` : ''}</div>
        <div className="char-level" style={at(592, 80)}>{s.level ?? 1}</div>

        {/* atributos primarios: valor en la casilla + nombre a la derecha del ícono.
            Con puntos disponibles aparece un "+" para repartirlos. */}
        {PRIMARIES.map((p) => (
          <div key={p.key}>
            <div className="char-primary-val" style={at(192, p.y + 14)}>{s[p.key] ?? 0}</div>
            <div className="char-primary-lbl" style={at(300, p.y + 14)}>{t('attr_' + p.key)} <em>{t('abbr_' + p.key)}</em></div>
            {attrPts > 0 && (
              <button className="char-attr-add" style={at(244, p.y + 14)}
                      onClick={() => allocAttr(p.key)} aria-label={t('attr_' + p.key)}>+</button>
            )}
          </div>
        ))}

        {attrPts > 0 && (
          <div className="char-attr-pts" style={at(320, 286)}>{t('attr_points_n', { n: attrPts })}</div>
        )}

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
        </div>
      </div>
    </div>
  )
}
