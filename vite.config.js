import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// La ruta base sale de VITE_BASE (.env.development / .env.production):
//   local:      /poly-bison/  -> http://localhost:5173/poly-bison/
//   producción: /             -> https://poly-bison.com/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(),],
    base: env.VITE_BASE || '/',
  }
})
