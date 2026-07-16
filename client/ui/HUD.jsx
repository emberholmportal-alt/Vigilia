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
      <span>👁 {t('spectating')}</span>
      <span className="spec-hint">{t('spec_hint')}</span>
      <button onClick={onExit}>▶ {t('play_now')}</button>
    </div>
  )
}

export default function HUD({ onExitSpectate }) {
  const spectator = useGameStore((s) => s.spectator)
  const mapTitle = useGameStore((s) => s.mapTitle)
  const playerName = useGameStore((s) => s.playerName)
  const fps = useGameStore((s) => s.fps)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const belt = useGameStore((s) => s.belt)
  const xp = useGameStore((s) => s.xp)
  const nearby = useGameStore((s) => s.nearby)
  const requestInteract = useGameStore((s) => s.requestInteract)
  const nearbyPortal = useGameStore((s) => s.nearbyPortal)
  const openWaypoints = useGameStore((s) => s.openWaypoints)
  const nearbyNode = useGameStore((s) => s.nearbyNode)
  const requestGather = useGameStore((s) => s.requestGather)
  const togglePanel = useGameStore((s) => s.togglePanel)
  const openMissions = useGameStore((s) => s.openMissions)
  const missions = useGameStore((s) => s.missions)
  const useBelt = useGameStore((s) => s.useBelt)
  const equippedBelt = useGameStore((s) => s.equippedBelt)
  const beltCap = beltCapacityOf(equippedBelt)
  const t = useT()

  const s = stats || { level: 1, str: 0, dex: 0, int: 0, vit: 0, hp: 0, hpMax: 1, mp: 0, mpMax: 1 }
  const prog = playerProgress(xp || 0)

  // El mirón sólo observa: HUD mínimo (barra de espectador + título de zona), sin orbes,
  // barra de acciones, misiones ni XP.
  if (spectator) {
    return (
      <>
        <SpectatorBar onExit={onExitSpectate} t={t} />
        <div className="hud">
          <div className="telemetry">
            <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
            <span className="dim2">{mapTitle}</span>
          </div>
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
            <span>{t('lv')} {s.level}</span>
            <span>{t('abbr_str')} {s.str}</span>
            <span>{t('abbr_dex')} {s.dex}</span>
            <span>{t('abbr_int')} {s.int}</span>
            <span>{t('abbr_vit')} {s.vit}</span>
          </div>
        </button>
        <div className="telemetry">
          <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
          <span className="dim2">{mapTitle}</span>
        </div>
        <div className="hud-right">
          {(() => {
            const claimable = (missions || []).filter((m) => m.progress >= m.target && !m.claimed).length
            return (
              <button className={'hud-missions' + (claimable > 0 ? ' ready' : '')} onClick={openMissions} title={t('missions_menu')}>
                <span className="hud-missions-ic">📜</span>
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
        <MenuRow onPanel={togglePanel} />
        <BuffBar />
        <div className="globe-row">
          <Globe type="hp" value={s.hp} max={s.hpMax} label={`${s.hp}/${s.hpMax}`} />
          <ActionBar belt={belt} gold={gold} onUseBelt={useBelt} beltCap={beltCap} />
          <DesktopBar belt={belt} onPanel={togglePanel} onUseBelt={useBelt} beltCap={beltCap} />
          <Globe type="mp" value={s.mp} max={s.mpMax} label={`${s.mp}/${s.mpMax}`} />
        </div>

        <div className="xp-strip" title={t('xp_of', { lv: s.level, into: prog.into, need: prog.need })}
             style={{ backgroundImage: `url(${UI}bar_xp_background.png)` }}>
          <div className="xp-strip-fill" style={{ width: `${prog.pct * 96}%`, backgroundImage: `url(${UI}bar_xp.png)` }} />
        </div>
      </div>
    </>
  )
}
