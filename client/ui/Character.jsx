// Hoja de personaje con el panel REAL de Flare (menus/character.png) y las
// coordenadas de menus/character.txt. Nombre, nivel, los 4 atributos en sus casillas
// (con los íconos ya dibujados: espada/vara/flechas/escudo) y una lista de derivados.
import { useEffect } from 'react'
import { useGameStore } from '../store.js'
import { playerProgress } from '../data/progression.js'
import { attrEarned, attrSpent } from '../data/skilltree.js'
import { useT } from './useT.js'
import { raceName, zoneName } from '../i18n.js'

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
  const myFeats = useGameStore((s) => s.myFeats)
  const guild = useGameStore((s) => s.guild)
  const guildRole = useGameStore((s) => s.guildRole)
  const guildRanking = useGameStore((s) => s.guildRanking)
  const refreshGuild = useGameStore((s) => s.refreshGuild)
  const t = useT()
  // Refrescá membresía + ranking al abrir la hoja (el server es autoritativo). Los datos ya
  // vienen cacheados del arranque, así que esto sólo los mantiene frescos, no bloquea la UI.
  useEffect(() => { refreshGuild() }, [refreshGuild])
  const s = stats || {}
  const prog = playerProgress(xp || 0)
  // Puntos de atributo disponibles (se reparten con el botón "+" de cada atributo).
  const attrPts = attrEarned(s.level || 1) - attrSpent(attrAlloc)
  // Gremio (solo lectura): top público y tu posición en él.
  const ranking = guildRanking || []
  const topGuilds = ranking.slice(0, 5)
  const myRank = guild ? ranking.findIndex((g) => g.id === guild.id) + 1 : 0

  // Derivados que mostramos en la lista (reflejan raza/nivel + equipo).
  const derived = [
    [t('stat_hp'), `${s.hp}/${s.hpMax}`],
    [t('stat_mp'), `${s.mp}/${s.mpMax}`],
    [t('stat_dmg'), s.dmgMin != null ? `${s.dmgMin}–${s.dmgMax}` : '—'],
    [t('stat_def'), s.defense || 0],
    ...(s.crit ? [[t('stat_crit'), `${s.crit}%`]] : []),
    ...(s.hpRegen ? [[t('stat_hpregen'), `${s.hpRegen}/s`]] : []),
    ...(s.itemFind ? [[t('stat_magicfind'), `+${s.itemFind}%`]] : []),
    [t('stat_speed'), s.speedMul ? `×${s.speedMul}` : '×1'],
    [t('stat_xpbonus'), s.xpMul ? `×${s.xpMul.toFixed(2)}` : '×1'],
    ...(s.set ? [[t('stat_set'), `${s.set.label} ${s.set.pieces}/6`]] : []),
    ...(myFeats ? [[t('feat_bosses'), `${myFeats.bosses}/${myFeats.bossTotal}`]] : []),
    ...(myFeats && myFeats.deepest?.level > 0 ? [[t('feat_deepest'), `${zoneName(myFeats.deepest.map, t.lang)} · ${t('pm_lvl')} ${myFeats.deepest.level}`]] : []),
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

          {/* Gremio (solo lectura): a qué gremio pertenecés y el top público. Fundar/unirse/gestionar
              se hace sólo en la Casa de Gremios (NPC), así que acá no hay acciones. */}
          <div className="char-guild">
            <div className="char-guild-head">{t('char_guild')}</div>
            {guild ? (
              <div className="char-guild-mine">
                <span className="char-guild-chip" style={{ background: guild.color }}>{guild.tag}</span>
                <div className="char-guild-txt">
                  <b>{guild.name}</b>
                  <span>{t('guild_level_n', { n: guild.level })} · {t('guild_' + (guildRole || 'member'))}
                    {myRank > 0 ? ` · ${t('char_guild_rank_you', { n: myRank })}` : ''}</span>
                </div>
              </div>
            ) : (
              <div className="char-guild-none">
                <b>{t('char_no_guild')}</b>
                <span>{t('char_guild_hall')}</span>
              </div>
            )}

            {topGuilds.length > 0 && (
              <>
                <div className="char-guild-sub">{t('char_guild_top')}</div>
                <div className="char-guild-rank">
                  {topGuilds.map((g, i) => (
                    <div key={g.id} className={'char-guild-row' + (guild && g.id === guild.id ? ' mine' : '')}>
                      <span className="char-guild-n">{i + 1}</span>
                      <span className="char-guild-chip sm" style={{ background: g.color }}>{g.tag}</span>
                      <span className="char-guild-name">{g.name}</span>
                      <span className="char-guild-meta">{t('guild_level_n', { n: g.level })} · {t('guild_members_n', { n: g.members })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
