// Pantalla de inicio estilo Kintara: logo, contadores (online / mensuales), y dos acciones —
// PLAY NOW (jugar) y SPECTATE (mirón). En online, además, conexión de billetera (Solana): la
// cuenta es la wallet. Por ahora NO se exige ninguna moneda ($VEL todavía no existe).
import { useState, useEffect } from 'react'
import { useT } from './useT.js'
import { net, ONLINE, fetchStats } from '../net/net.js'
import { walletSignIn, loadSession, clearSession } from '../net/wallet.js'
import { deviceAuth } from '../net/online.js'
import HowToPlay from './HowToPlay.jsx'
import Docs from './Docs.jsx'

const LOGO = (import.meta.env.BASE_URL || '/') + 'velgrinlogo.png'
const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '')

export default function StartScreen({ onPlay, onSpectate, onNew, canContinue, loading }) {
  const t = useT()
  const [wallet, setWallet] = useState(loadSession()?.pubkey || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [stats, setStats] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showDocs, setShowDocs] = useState(false)

  // Contadores en vivo (online / mensuales) desde el server.
  useEffect(() => {
    if (!ONLINE) return
    let alive = true
    const tick = async () => { const s = await fetchStats(); if (alive && s) setStats(s) }
    tick()
    const id = setInterval(tick, 15000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Asegura sesión de billetera (reanuda con el token o firma de nuevo). { ok, char } o { ok:false }.
  async function ensureWallet() {
    await net.connect()
    const sess = loadSession()
    if (sess?.token) {
      const r = await net.resume(sess.token).catch(() => ({ ok: false }))
      if (r.ok) { setWallet(sess.pubkey); return { ok: true, char: r.char } }
    }
    const r = await walletSignIn(net)
    if (!r.ok) return { ok: false, error: r.error }
    setWallet(r.pubkey)
    return { ok: true, char: r.char }
  }

  async function connect() {
    setBusy(true); setErr(null)
    try { const r = await ensureWallet(); if (!r.ok) setErr(r.error === 'no-wallet' ? t('wallet_none') : t('wallet_fail')) }
    catch { setErr(t('wallet_fail')) }
    setBusy(false)
  }
  function disconnect() { clearSession(); setWallet(null) }

  // PLAY NOW: no exige billetera. Si ya conectaste una, se usa esa identidad; si no, entrás con
  // una cuenta de dispositivo (deviceAuth). La wallet queda opcional hasta que exista el token $VEL.
  async function handlePlay() {
    if (!ONLINE) { onPlay(null); return }
    setBusy(true); setErr(null)
    try {
      await net.connect()
      const auth = await deviceAuth(net)   // wallet si ya está; si no, cuenta de dispositivo
      setBusy(false)
      if (auth.wallet) setWallet(auth.wallet)
      onPlay(auth.ok ? auth.char : null)
    } catch { setBusy(false); onPlay(null) }
  }

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
                <button className="wallet-disc" onClick={disconnect}>🔌 {t('wallet_disconnect')}</button>
              </div>
            ) : (
              <>
                <button className="wallet-btn" onClick={connect} disabled={busy}>
                  {busy ? t('wallet_connecting') : '🔗 ' + t('wallet_connect')}
                </button>
                <p className="wallet-hint">{t('wallet_optional')}</p>
              </>
            )}
            {err && <p className="wallet-err">{err}</p>}
          </div>
        )}

        <div className="entry">
          <button className="enter play-now" onClick={handlePlay} disabled={loading || busy}>
            {busy ? t('wallet_connecting') : loading ? t('loading') : '▶ ' + t('play_now')}
          </button>
          <button className="enter secondary" onClick={onSpectate} disabled={loading}>
            👁 {t('spectate')}
          </button>
        </div>
        {!ONLINE && canContinue && <button className="new-link" onClick={onNew}>{t('start_new')}</button>}

        <div className="htp-links">
          <button className="htp-link" onClick={() => setShowGuide(true)}>{t('how_to_play')}</button>
          <button className="htp-link" onClick={() => setShowDocs(true)}>{t('docs_link')}</button>
        </div>

        <p className="attribution">
          {t('start_credit')}
          <br />
          <a href="https://github.com/flareteam/flare-game" target="_blank" rel="noreferrer">
            github.com/flareteam/flare-game
          </a>
        </p>
      </div>
      {showGuide && <HowToPlay onClose={() => setShowGuide(false)} />}
      {showDocs && <Docs onClose={() => setShowDocs(false)} />}
    </div>
  )
}
