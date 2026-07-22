// Lista de servidores (mundos). Por ahora hay UNO nominal ("Velgrim"): el sistema de canales del
// backend ya autocompleta cupo (concentra gente hasta CHANNEL_CAP antes de abrir otro canal). Esta
// estructura queda lista para sumar mundos reales más adelante: cada uno con su propia `url` (WS).
// Sólo se listan servidores con `url`; cuando haya multiserver mostramos los que tengan gente.
import { WS_URL } from './net.js'

export const SERVERS = [
  { id: 'velgrim', name: 'Velgrim', region: 'Global', url: WS_URL },
]

const KEY = 'velgrim:server'
export function loadServerId() { try { return localStorage.getItem(KEY) || SERVERS[0].id } catch { return SERVERS[0].id } }
export function saveServerId(id) { try { localStorage.setItem(KEY, id) } catch {} }
export function serverById(id) { return SERVERS.find((s) => s.id === id) || SERVERS[0] }
