import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El canvas del juego (Pixi) y el HUD (React) viven en client/.
// public/ sirve assets.json y los mapas JSON como estáticos.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', outDir: 'dist' },
})
