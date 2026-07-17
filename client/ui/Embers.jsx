// Brasas flotantes para la ambientación de los menús (puro CSS, sin coste real).
// Cada brasa sube con deriva, duración y demora aleatorias. Decorativo (aria-hidden).
import { useMemo } from 'react'

export default function Embers({ count = 20 }) {
  // Memoizado: sin esto, cada re-render del menú (p.ej. el poll de stats de StartScreen cada 15s)
  // regeneraba posiciones aleatorias y las brasas saltaban/reiniciaban. Se calculan una sola vez.
  const bits = useMemo(() => {
    const out = []
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100
      const dur = 7 + Math.random() * 9
      const delay = -Math.random() * 16
      const size = 2 + Math.random() * 3
      const drift = Math.random() * 60 - 30
      out.push(
        <i
          key={i}
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
            '--drift': `${drift}px`,
          }}
        />
      )
    }
    return out
  }, [count])
  return <div className="embers" aria-hidden="true">{bits}</div>
}
