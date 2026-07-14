// Pantalla de inicio estilo Kintara: logo, contadores (online / mensuales), y dos acciones —
// PLAY NOW (jugar) y SPECTATE (mirón). En online, además, conexión de billetera (Solana): la
// cuenta es la wallet. Por ahora NO se exige ninguna moneda ($VEL todavía no existe).
import { useState, useEffect } from 'react'
import { useT } from './useT.js'
import { net, ONLINE, fetchStats } from '../net/net.js'
import { walletSignIn, loadSession, clearSession } from '../net/wallet.js'

const LOGO = (import.meta.env.BASE_URL || '/') + 'velgrinlogo.png'
const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '')

export default function StartScreen({ onPlay, onSpectate, onNew, canContinue, loading }) {
  const t = useT()
  const [wallet, setWallet] = useState(loadSession()?.pubkey || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [stats, setStats] = useState(null)

  // Contadores en vivo (online / mensuales) desde el server.
  useEffect(() => {
    if (!ONLINE) return
    let alive = true
    const tick = async () => { const s = await fetchStats(); if (alive && s) setStats(s) }
    tick()
    const id = setInterval(tick, 15000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  async function connect() {
    setBusy(true); setErr(null)
    try {
      await net.connect()
      const r = await walletSignIn(net)
      if (r.ok) setWallet(r.pubkey)
      else setErr(r.error === 'no-wallet' ? t('wallet_none') : t('wallet_fail'))
    } catch { setErr(t('wallet_fail')) }
    setBusy(false)
  }
  function disconnect() { clearSession(); setWallet(null) }

  return (
    <div className="start">
      <div className="start-inner">
        <img className="start-logo" src={LOGO} alt="Velgrim" />
        <p className="tagline">{t('start_tag')}</p>

        {ONLINE && stats && (
          <div className="counters">
            <span className="counter"><i className="dot on" /> <b>{stats.online}</b> {t('players_online')}</span>
            <span className="counter"><b>{stats.monthly}</b> {t('players_monthly')}</span>
          </div>
        )}

        {ONLINE && (
          <div className="wallet-box">
            {wallet ? (
              <div className="wallet-on">
                <span>🟢 {t('wallet_connected')}: <b>{short(wallet)}</b></span>
                <button className="wallet-x" onClick={disconnect} title={t('wallet_disconnect')}>✕</button>
              </div>
            ) : (
              <button className="wallet-btn" onClick={connect} disabled={busy}>
                {busy ? t('wallet_connecting') : '🔗 ' + t('wallet_connect')}
              </button>
            )}
            {err && <p className="wallet-err">{err}</p>}
          </div>
        )}

        <div className="entry">
          <button className="enter play-now" onClick={onPlay} disabled={loading}>
            {loading ? t('loading') : '▶ ' + t('play_now')}
          </button>
          <button className="enter secondary" onClick={onSpectate} disabled={loading}>
            👁 {t('spectate')}
          </button>
        </div>
        {canContinue && <button className="new-link" onClick={onNew}>{t('start_new')}</button>}

        <p className="attribution">
          Arte, sprites, tilesets y mapas: <b>Flare — Empyrean Campaign</b>,
          © Flare Team, bajo licencia CC-BY-SA 3.0.
          <br />
          <a href="https://github.com/flareteam/flare-game" target="_blank" rel="noreferrer">
            github.com/flareteam/flare-game
          </a>
        </p>
      </div>
    </div>
  )
}
