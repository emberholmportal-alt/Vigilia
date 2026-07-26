// Registro/chat estilo Valorant abajo a la izquierda, con la estética de Velgrim (piedra
// oscura + tags de canal). Muestra los últimos eventos (loot, combate, nivel) y deja
// "hablar": lo que escribís aparece como globo sobre la cabeza del personaje + acá.
import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store.js'
import { Chat } from './Icon.jsx'
import { useT } from './useT.js'

const CHANNEL = {
  sistema: { key: 'chan_sistema', color: '#c9a227' },
  mundo: { key: 'chan_mundo', color: '#b98bff' },
  gremio: { key: 'chan_gremio', color: '#6bd08a' },
  yo: { color: '#7fd0e6' },
}

export default function ChatLog() {
  const log = useGameStore((s) => s.chatLog)
  const sayChat = useGameStore((s) => s.sayChat)
  const spectator = useGameStore((s) => s.spectator)
  const guild = useGameStore((s) => s.guild)
  const chatChannel = useGameStore((s) => s.chatChannel)
  const setChatChannel = useGameStore((s) => s.setChatChannel)
  const t = useT()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const endRef = useRef(null)
  // Si dejo el gremio mientras el canal era 'gremio', vuelvo a 'mundo'.
  useEffect(() => { if (!guild && chatChannel === 'gremio') setChatChannel('mundo') }, [guild, chatChannel])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [log])

  function submit(e) {
    e.preventDefault()
    if (text.trim()) sayChat(text)
    setText('')
    setOpen(false)
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {log.slice(-9).map((m) => (
          <div className="chat-line" key={m.id}>
            {m.channel === 'yo' ? (
              <><span className="chat-name">{m.name}:</span> {m.text}</>
            ) : m.channel === 'gremio' ? (
              <><span className="chat-tag" style={{ color: CHANNEL.gremio.color }}>({t('chan_gremio')})</span>
                <span className="chat-name" style={{ color: CHANNEL.gremio.color }}> {m.name}:</span> {m.text}</>
            ) : (
              <><span className="chat-tag" style={{ color: CHANNEL[m.channel]?.color }}>
                ({CHANNEL[m.channel]?.key ? t(CHANNEL[m.channel].key) : m.channel})
              </span> {m.text}</>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* El mirón sólo observa: no puede hablar. */}
      {spectator ? null : open ? (
        <form className="chat-input" onSubmit={submit}>
          {guild && (
            <button type="button" className={'chat-chan' + (chatChannel === 'gremio' ? ' guild' : '')}
                    onMouseDown={(e) => { e.preventDefault(); setChatChannel(chatChannel === 'gremio' ? 'mundo' : 'gremio') }}
                    title={t('chat_toggle_channel')}>
              {chatChannel === 'gremio' ? `[${guild.tag}]` : t('chan_mundo')}
            </button>
          )}
          <input autoFocus value={text} maxLength={120}
                 onChange={(e) => setText(e.target.value)}
                 onBlur={() => { if (!text.trim()) setOpen(false) }}
                 placeholder={chatChannel === 'gremio' ? t('say_guild') : t('say_something')} />
        </form>
      ) : (
        <button className="chat-say" onClick={() => setOpen(true)}><Chat /> {t('talk')}</button>
      )}
    </div>
  )
}
