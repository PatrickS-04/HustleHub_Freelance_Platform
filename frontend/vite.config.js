import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The API only accepts the origin https://localhost:5173 (CORS + SameSite=Strict
// cookie), so the dev server must run over HTTPS. Reuse the API's local cert.
// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = env.VITE_API_URL || 'https://localhost:3443'

  // `vite build` serves nothing, so don't require the certs (they're absent in CI).
  const https = command === 'build' ? undefined : {
    key: fs.readFileSync('../API/certs/key.pem'),
    cert: fs.readFileSync('../API/certs/cert.pem'),
  }

  // Safe in dev and preview.
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }

  // Strict CSP for the built app (`npm run preview`). Not applied to the dev
  // server, which needs inline scripts for hot reload.
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${api}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, https, headers: baseHeaders },
    preview: {
      port: 5173,
      strictPort: true,
      https,
      headers: { ...baseHeaders, 'Content-Security-Policy': csp },
    },
  }
})
