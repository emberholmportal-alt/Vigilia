// HUD permanente estilo Diablo: globos de vida/maná en las esquinas, la barra de acción
// real de Flare al centro (cinturón + botones de menú) y la barra de XP abajo. Los stats
// arriba a la izquierda (tocables abren el panel de personaje). Sin stamina ni chat.
import { useEffect } from 'react'
import { useGameStore, beltCapacityOf } from '../store.js'
import { playerProgress } from '../data/progression.js'
import Globe from './Globe.jsx'
import ActionBar, { MenuRow, DesktopBar, BuffBar } from './ActionBar.jsx'
import { useT } from './useT.js'
import { raceName } from '../i18n.js'
import { Scroll, Eye } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

// Íconos SVG para los botones de interacción (sin emojis). Heredan el color del texto.
const Svg = (props) => (
  <svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
)
const IcPortal = () => <Svg><circle cx="12" cy="12" r="8.5" /><path d="M12 5.5a6.5 6.5 0 1 1-6 4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></Svg>
const IcTalk = () => <Svg><path d="M20 4H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" /></Svg>
const IcTrade = () => <Svg><ellipse cx="12" cy="6.5" rx="7" ry="2.8" /><path d="M5 6.5v5c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-5" /><path d="M5 11.5v5c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-5" /></Svg>
const IcPick = () => <Svg><path d="M4.5 19.5 13 11" /><path d="M6 8.5c4-2.2 9-1 12 4" /><path d="M9.5 5c2.4 3 5 5.6 8 7" /></Svg>
const IcHerb = () => <Svg><path d="M12 21v-9" /><path d="M12 13c-3.2 0-5.3-2-5.3-5.3 3.2 0 5.3 2 5.3 5.3Z" /><path d="M12 11c3.2 0 5.3-2 5.3-5.3-3.2 0-5.3 2-5.3 5.3Z" /></Svg>

// Aviso breve que aparece arriba de la barra y se va solo.
function Toast() {
  const toast = useGameStore((s) => s.toast)
  const clearToast = useGameStore((s) => s.clearToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 2200)
    return () => clearTimeout(t)
  }, [toast, clearToast])
  if (!toast) return null
  return <div className="toast" key={toast.until}>{toast.text}</div>
}

// Barra del modo espectador: aviso + botón para pasar a jugar.
function SpectatorBar({ onExit, t }) {
  return (
    <div className="spectator-bar">
      <span><Eye /> {t('spectating')}</span>
      <span className="spec-hint">{t('spec_hint')}</span>
      <button onClick={onExit}>▶ {t('play_now')}</button>
    </div>
  )
}

// Leaf: telemetría (fps + zona). Aislada para que el refresco de fps (cada 0.5s) no re-renderice
// el HUD entero. "React no toca el loop": lo que cambia seguido vive en su propia hoja.
function Telemetry() {
  const fps = useGameStore((s) => s.fps)
  const mapTitle = useGameStore((s) => s.mapTitle)
  return (
    <div className="telemetry">
      <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
      <span className="dim2">{mapTitle}</span>
    </div>
  )
}

// Leaf: globos de vida/maná. Suscriben SÓLO hp/mp (primitivos) para que la regen constante no
// re-renderice el HUD completo (ActionBar, misiones, etc.), sino nada más el orbe que cambió.
function HpGlobe() {
  const hp = useGameStore((s) => s.stats?.hp ?? 0)
  const hpMax = useGameStore((s) => s.stats?.hpMax ?? 1)
  return <Globe type="hp" value={hp} max={hpMax} label={`${hp}/${hpMax}`} />
}
function MpGlobe() {
  const mp = useGameStore((s) => s.stats?.mp ?? 0)
  const mpMax = useGameStore((s) => s.stats?.mpMax ?? 1)
  return <Globe type="mp" value={mp} max={mpMax} label={`${mp}/${mpMax}`} />
}

export default function HUD({ onExitSpectate }) {
  const spectator = useGameStore((s) => s.spectator)
  const playerName = useGameStore((s) => s.playerName)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  // Sólo los atributos LENTOS del stat block (cambian al subir de nivel/equipar, no por frame).
  // hp/mp/fps viven en sus hojas (arriba) para no re-renderizar todo el HUD con la regen.
  const level = useGameStore((s) => s.stats?.level ?? 1)
  const str = useGameStore((s) => s.stats?.str ?? 0)
  const dex = useGameStore((s) => s.stats?.dex ?? 0)
  const intel = useGameStore((s) => s.stats?.int ?? 0)
  const vit = useGameStore((s) => s.stats?.vit ?? 0)
  const belt = useGameStore((s) => s.belt)
  const xp = useGameStore((s) => s.xp)
  const nearby = useGameStore((s) => s.nearby)
  const requestInteract = useGameStore((s) => s.requestInteract)
  const nearbyPortal = useGameStore((s) => s.nearbyPortal)
  const openWaypoints = useGameStore((s) => s.openWaypoints)
  const nearbyNode = useGameStore((s) => s.nearbyNode)
  const requestGather = useGameStore((s) => s.requestGather)
  const togglePanel = useGameStore((s) => s.togglePanel)
  const lootLabels = useGameStore((s) => s.lootLabels)
  const toggleLootLabels = useGameStore((s) => s.toggleLootLabels)
  const openMissions = useGameStore((s) => s.openMissions)
  const missions = useGameStore((s) => s.missions)
  const useBelt = useGameStore((s) => s.useBelt)
  const equippedBelt = useGameStore((s) => s.equippedBelt)
  const beltCap = beltCapacityOf(equippedBelt)
  const t = useT()

  const prog = playerProgress(xp || 0)

  // El mirón sólo observa: HUD mínimo (barra de espectador + título de zona), sin orbes,
  // barra de acciones, misiones ni XP.
  if (spectator) {
    return (
      <>
        <SpectatorBar onExit={onExitSpectate} t={t} />
        <div className="hud">
          <Telemetry />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="hud">
        <button className="who" onClick={() => togglePanel('character')} title={t('view_character')}>
          <b>{playerName} {race ? '· ' + raceName(race, t.lang) : ''}</b>
          <div className="attrs">
            <span>{t('lv')} {level}</span>
            <span>{t('abbr_str')} {str}</span>
            <span>{t('abbr_dex')} {dex}</span>
            <span>{t('abbr_int')} {intel}</span>
            <span>{t('abbr_vit')} {vit}</span>
          </div>
        </button>
        <Telemetry />
        <div className="hud-right">
          {(() => {
            const claimable = (missions || []).filter((m) => m.progress >= m.target && !m.claimed).length
            return (
              <button className={'hud-missions' + (claimable > 0 ? ' ready' : '')} onClick={openMissions} title={t('missions_menu')}>
                <span className="hud-missions-ic"><Scroll /></span>
                <span className="hud-missions-lbl">{t('missions_menu')}</span>
                {claimable > 0 ? <span className="hud-badge">{claimable}</span> : null}
              </button>
            )
          })()}
          <div className="hud-gold"><span className="ab-coin" /> {gold}</div>
        </div>
      </div>

      <Toast />

      <div className="hud-bottom">
        {nearbyPortal && (
          <div className="interact-wrap">
            <button className="interact-btn portal-btn" onClick={openWaypoints}>
              <IcPortal /> {t('portal_use')}
            </button>
          </div>
        )}
        {nearby && (
          <div className="interact-wrap">
            <button className="interact-btn" onClick={requestInteract}>
              {nearby.shop ? <IcTrade /> : <IcTalk />} {nearby.shop ? t('trade_with', { name: nearby.name }) : t('talk_with', { name: nearby.name })}
            </button>
          </div>
        )}
        {nearbyNode && !nearby && (
          <div className="interact-wrap">
            <button className="interact-btn gather-btn" onClick={requestGather}>
              {nearbyNode.skill === 'excavacion' ? <IcPick /> : <IcHerb />} {t('gather_action', { name: nearbyNode.name })}
            </button>
          </div>
        )}
        <button className={'loot-toggle' + (lootLabels ? ' on' : '')} onClick={toggleLootLabels} title={t('loot_labels')}>
          <Eye /> {t('loot_labels')}
        </button>
        <MenuRow onPanel={togglePanel} />
        <BuffBar />
        <div className="globe-row">
          <HpGlobe />
          <ActionBar belt={belt} gold={gold} onUseBelt={useBelt} beltCap={beltCap} />
          <DesktopBar belt={belt} onPanel={togglePanel} onUseBelt={useBelt} beltCap={beltCap} />
          <MpGlobe />
        </div>

        <div className="xp-strip" title={t('xp_of', { lv: level, into: prog.into, need: prog.need })}
             style={{ backgroundImage: `url(${UI}bar_xp_background.png)` }}>
          <div className="xp-strip-fill" style={{ width: `${prog.pct * 96}%`, backgroundImage: `url(${UI}bar_xp.png)` }} />
        </div>
      </div>
    </>
  )
}
