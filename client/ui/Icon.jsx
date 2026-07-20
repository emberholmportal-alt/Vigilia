// Íconos SVG compartidos (sin emojis). Heredan el color del texto (currentColor) y escalan con
// el font-size (1em). Usados en los paneles: candados, misiones, chat, herrero, etc.
const S = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ verticalAlign: '-0.13em', flex: '0 0 auto' }} {...p}>{children}</svg>
)

// Candado (celdas/beneficios bloqueados)
export const Lock = (p) => <S {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></S>
// Pergamino (misiones / quests)
export const Scroll = (p) => <S {...p}><path d="M6 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V5" /><path d="M5 5a2 2 0 0 1 4 0v0" /><path d="M9 8h7M9 12h7M9 16h5" /></S>
// Cofre / regalo (cofre de sellos)
export const Chest = (p) => <S {...p}><rect x="3.5" y="8" width="17" height="11" rx="1.5" /><path d="M3.5 12h17" /><path d="M10 8V6a2 2 0 0 1 4 0v2" /><path d="M11 12h2v3h-2z" fill="currentColor" stroke="none" /></S>
// Sello / estrella (fragmentos de sello)
export const Seal = (p) => <S {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="currentColor" stroke="none" /></S>
// Gema / cristal (cristales de forja)
export const Gem = (p) => <S {...p}><path d="M6 3h12l3 5-9 13L3 8z" /><path d="M3 8h18M9 3l-3 5 6 13 6-13-3-5" /></S>
// Espada (arma / slot main)
export const Sword = (p) => <S {...p}><path d="M14.5 4.5 20 3l-1.5 5.5-8 8" /><path d="M6.5 14.5 4 20l5.5-2.5" /><path d="M11 13l3 3" /><path d="M3.5 16.5 7 20" /></S>
// Escudo (armadura / slot off)
export const Shield = (p) => <S {...p}><path d="M12 3l7 2.5v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10v-5z" /></S>
// Globo de diálogo (chat)
export const Chat = (p) => <S {...p}><path d="M20 4H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" /></S>
// Puño (sin arma equipada)
export const Fist = (p) => <S {...p}><path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V11" /><path d="M10 10.5V6.5a1.5 1.5 0 0 1 3 0V11" /><path d="M13 7.5a1.5 1.5 0 0 1 3 0V13c0 3.5-2.2 6-5.5 6S5 16.5 5 13v-1.5a1.5 1.5 0 0 1 3 0" /></S>
// Engranaje (configurar el botón derecho)
export const Gear = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></S>
// Ojo (modo espectador / mirón)
export const Eye = (p) => <S {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.6" /></S>
// Portal / obelisco (viajar, despertar)
export const Portal = (p) => <S {...p}><path d="M12 2c3.5 0 6 4 6 9s-2.5 11-6 11-6-6-6-11 2.5-9 6-9Z" /><path d="M6.5 9h11M6 14h12" /></S>
// Ciclo (el loop de juego)
export const Loop = (p) => <S {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" /><path d="M4 20v-4h4" /></S>
// Botas (viajar entre zonas)
export const Boots = (p) => <S {...p}><path d="M8 3v9c0 1-.5 2-2 3s-3 2-3 4h9v-3" /><path d="M12 12h3c1.5 0 3 1 3.5 3l1 3H12" /><path d="M8 12h4" /></S>
// Tumba (la muerte deja tu carga)
export const Grave = (p) => <S {...p}><path d="M7 21V9a5 5 0 0 1 10 0v12Z" /><path d="M10 8h4M12 6v6" /><path d="M4 21h16" /></S>
// Moneda (economía / oro / $VEL)
export const Coin = (p) => <S {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.8" /></S>
// Trueque / intercambio (dos flechas cruzadas)
export const Swap = (p) => <S {...p}><path d="M4 8h13l-3-3M20 16H7l3 3" /></S>
// Barras / estadísticas (ver stats de otro jugador)
export const Stats = (p) => <S {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></S>
// Globo / mundo (selección de servidor)
export const Globe = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></S>
// Sonido activado
export const Sound = (p) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8 8 0 0 1 0 12" /></S>
// Sonido silenciado
export const Mute = (p) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M22 9l-5 6M17 9l5 6" /></S>
// Enchufe / conexión (billetera)
export const Plug = (p) => <S {...p}><path d="M9 3v6M15 3v6M6 9h12v2a6 6 0 0 1-12 0zM12 17v4" /></S>
// Alijo / bodega (baúl de guardado en el pueblo)
export const Stash = (p) => <S {...p}><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M3 12h18" /><path d="M8 7V5a4 4 0 0 1 8 0v2" /><path d="M10.5 12h3v3h-3z" fill="currentColor" stroke="none" /></S>

// Moneda de oro (visual dorada, no emoji). `n` = cantidad opcional al lado.
export function Gold({ n, size = 15 }) {
  return (
    <span className="gold-amt">
      <span className="ab-coin" style={{ width: size, height: size }} aria-hidden="true" />
      {n != null && <span className="gold-n">{n}</span>}
    </span>
  )
}
