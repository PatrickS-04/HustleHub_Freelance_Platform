import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API only accepts the origin https://localhost:5173 (CORS + SameSite=Strict
// cookie), so the dev server must run over HTTPS. Reuse the API's local cert.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    https: {
      key: fs.readFileSync('../API/certs/key.pem'),
      cert: fs.readFileSync('../API/certs/cert.pem'),
    },
  },
})
