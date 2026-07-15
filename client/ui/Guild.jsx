// Casa de Gremios (WORLD.md): fundar/unirse, donar oro para subir el nivel del gremio, ver
// ventajas por nivel, la lista de miembros y el ranking público. El server es autoritativo:
// el oro de fundación/donación lo confirma el server (store.donateGuild / createGuild).
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { ONLINE, net } from '../net/net.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832
const BANNERS = ['#c9a227', '#b060ff', '#4aa3e0', '#e0894a', '#6bd08a', '#d0506a']

export default function Guild() {
  const guild = useGameStore((s) => s.guild)
  const role = useGameStore((s) => s.guildRole)
  const members = useGameStore((s) => s.guildMembers)
  const ranking = useGameStore((s) => s.guildRanking)
  const busy = useGameStore((s) => s.guildBusy)
  const error = useGameStore((s) => s.guildError)
  const gold = useGameStore((s) => s.gold)
  const createGuild = useGameStore((s) => s.createGuild)
  const joinGuild = useGameStore((s) => s.joinGuild)
  const leaveGuild = useGameStore((s) => s.leaveGuild)
  const donateGuild = useGameStore((s) => s.donateGuild)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  const [tab, setTab] = useState('mine')
  const online = ONLINE && net.connected

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }} onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('guild_title')}</div>

        <div className="pw-tabs">
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>{t('guild_tab_mine')}</button>
          <button className={tab === 'ranking' ? 'on' : ''} onClick={() => setTab('ranking')}>{t('guild_tab_ranking')}</button>
        </div>

        {!online
          ? <div className="guild-offline">{t('guild_offline_msg')}</div>
          : tab === 'mine'
            ? (guild
                ? <MyGuild guild={guild} role={role} members={members} gold={gold} busy={busy}
                           onDonate={donateGuild} onLeave={leaveGuild} error={error} t={t} />
                : <FoundGuild gold={gold} busy={busy} onCreate={createGuild} error={error} t={t} />)
            : <Ranking ranking={ranking} inGuild={!!guild} busy={busy} onJoin={joinGuild} myId={guild?.id} t={t} />}
      </div>
    </div>
  )
}

// --- Sin gremio: formulario de fundación ---
function FoundGuild({ gold, busy, onCreate, error, t }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [color, setColor] = useState(BANNERS[0])
  const canFound = gold >= 500 && name.trim().length >= 3 && tag.trim().length === 3 && !busy

  return (
    <div className="guild-body">
      <div className="guild-none">
        <b>{t('guild_none_title')}</b>
        <span>{t('guild_none_sub')}</span>
      </div>
      <div className="guild-found">
        <div className="guild-found-head">{t('guild_found_head')}</div>
        <input className="guild-input" maxLength={24} placeholder={t('guild_name_ph')}
               value={name} onChange={(e) => setName(e.target.value)} />
        <div className="guild-row">
          <input className="guild-input tag" maxLength={3} placeholder={t('guild_tag_ph')}
                 value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          <div className="guild-banner-pick">
            {BANNERS.map((c) => (
              <span key={c} className={'guild-swatch' + (c === color ? ' on' : '')}
                    style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="guild-preview" style={{ borderColor: color }}>
          <span className="guild-tag-chip" style={{ background: color }}>{tag || '···'}</span>
          <span className="guild-preview-name">{name || t('guild_name_ph')}</span>
        </div>
        {error && <div className="guild-error">{error}</div>}
        <button className="guild-btn primary" disabled={!canFound} onClick={() => onCreate(name.trim(), tag.trim(), color)}>
          {t('guild_found_btn')}
        </button>
        {gold < 500 && <div className="guild-hint">{t('guild_need_online') && `${gold}/500`}</div>}
      </div>
    </div>
  )
}

// --- Con gremio: nivel, donación, ventajas, miembros ---
function MyGuild({ guild, role, members, gold, busy, onDonate, onLeave, error, t }) {
  const [amt, setAmt] = useState('')
  const perks = [t('guild_perk1'), t('guild_perk2'), t('guild_perk3'), t('guild_perk4'), t('guild_perk5')]
  // progreso hacia el próximo nivel: donado actual vs umbral siguiente.
  const pct = guild.next ? Math.min(1, guild.donated / guild.next) : 1

  return (
    <div className="guild-body">
      <div className="guild-header" style={{ borderColor: guild.color }}>
        <span className="guild-tag-chip big" style={{ background: guild.color }}>{guild.tag}</span>
        <div className="guild-header-txt">
          <b>{guild.name}</b>
          <span>{t('guild_level_n', { n: guild.level })} · {t('guild_members_n', { n: members.length })}</span>
        </div>
      </div>

      <div className="guild-level-bar">
        <i style={{ width: `${Math.round(pct * 100)}%`, background: guild.color }} />
      </div>
      <div className="guild-level-cap">
        {guild.next ? t('guild_next_level', { n: guild.next - guild.donated, l: guild.level + 1 }) : t('guild_maxed')}
      </div>

      <div className="guild-donate">
        <input className="guild-input" type="number" min="1" placeholder={t('guild_donate_ph')}
               value={amt} onChange={(e) => setAmt(e.target.value)} />
        <button className="guild-btn" disabled={busy || !(Number(amt) > 0) || Number(amt) > gold}
                onClick={() => { onDonate(Number(amt)); setAmt('') }}>{t('guild_donate_btn')}</button>
      </div>
      {error && <div className="guild-error">{error}</div>}

      <div className="guild-perks">
        <div className="guild-sub">{t('guild_perks_head')}</div>
        {perks.map((p, i) => (
          <div key={i} className={'guild-perk' + (guild.level >= i + 1 ? ' on' : '')}>
            <span className="guild-perk-lv">{i + 1}</span>{p}
          </div>
        ))}
      </div>

      <div className="guild-roster">
        <div className="guild-sub">{t('guild_roster')}</div>
        <div className="guild-roster-list">
          {members.map((m, i) => (
            <div key={i} className="guild-member">
              <span>{m.username}</span>
              <em>{m.role === 'founder' ? t('guild_founder') : t('guild_member')}</em>
            </div>
          ))}
        </div>
      </div>

      <button className="guild-btn danger" disabled={busy}
              onClick={() => { if (confirm(t('guild_leave_confirm'))) onLeave() }}>{t('guild_leave_btn')}</button>
    </div>
  )
}

// --- Ranking público ---
function Ranking({ ranking, inGuild, busy, onJoin, myId, t }) {
  if (!ranking || !ranking.length) return <div className="guild-body"><div className="guild-empty">{t('guild_ranking_empty')}</div></div>
  return (
    <div className="guild-body">
      <div className="guild-rank-list">
        {ranking.map((g, i) => (
          <div key={g.id} className={'guild-rank-row' + (g.id === myId ? ' mine' : '')}>
            <span className="guild-rank-n">{i + 1}</span>
            <span className="guild-tag-chip" style={{ background: g.color }}>{g.tag}</span>
            <div className="guild-rank-txt">
              <b>{g.name}{g.id === myId ? ` · ${t('guild_you_tag')}` : ''}</b>
              <span>{t('guild_level_n', { n: g.level })} · {t('guild_members_n', { n: g.members })} · {t('guild_donated_total', { n: g.donated })}</span>
            </div>
            {!inGuild && <button className="guild-btn small" disabled={busy} onClick={() => onJoin(g.id)}>{t('guild_join_btn')}</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
