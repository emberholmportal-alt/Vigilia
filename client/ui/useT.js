// Hook de traducción para React: se suscribe al idioma del store (re-render al cambiarlo) y
// devuelve un `t` ligado, más helpers de etiquetas/nombres ya atados al idioma actual.
import { useGameStore } from '../store.js'
import { translate, slotLabel, statLabel, rarityLabel, itemName, zoneName } from '../i18n.js'

export function useT() {
  const lang = useGameStore((s) => s.lang)
  const t = (key, vars) => translate(lang, key, vars)
  t.lang = lang
  t.slot = (s) => slotLabel(s, lang)
  t.stat = (k) => statLabel(k, lang)
  t.rarity = (r) => rarityLabel(r, lang)
  t.item = (it) => itemName(it, lang)
  t.zone = (m, fb) => zoneName(m, lang, fb)
  return t
}
