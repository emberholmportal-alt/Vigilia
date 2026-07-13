// Splash de arranque: el logo de Velgrim es lo primero que se ve al entrar, con una barra de
// carga con la estética de Flare debajo. Al llenarse, pasa a la pantalla de inicio.
import { useEffect } from 'react'
import { useT } from './useT.js'

const LOGO = (import.meta.env.BASE_URL || '/') + 'velgrinlogo.png'
const BOOT_MS = 2400

export default function BootSplash({ onDone }) {
  const t = useT()
  useEffect(() => {
    const id = setTimeout(onDone, BOOT_MS)
    return () => clearTimeout(id)
  }, [onDone])
  return (
    <div className="boot">
      <div className="boot-inner">
        <img className="boot-logo" src={LOGO} alt="Velgrim" />
        <div className="boot-bar"><i style={{ animationDuration: BOOT_MS + 'ms' }} /></div>
        <p className="boot-label">{t('loading')}</p>
      </div>
    </div>
  )
}
