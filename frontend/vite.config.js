import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'

// The API only accepts the origin https://localhost:5173 (CORS + SameSite=Strict
// cookie), so the dev server must run over HTTPS. Reuse the API's local cert.
// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = env.VITE_API_URL || 'https://localhost:3443'

  // `vite build` and the unit tests serve nothing, so don't require the certs
  // (they're absent in CI).
  const https = command === 'build' || mode === 'test' ? undefined : {
    key: fs.readFileSync('../API/certs/key.pem'),
    cert: fs.readFileSync('../API/certs/cert.pem'),
  }

  // Safe in dev and preview.
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }

  // Strict CSP for the built app (`npm run preview`). The dev server gets the
  // same policy with two relaxations it cannot work without: inline scripts and
  // styles (hot reload injects both) and the hot-reload websocket.
  const cspFor = (dev) =>
    [
      "default-src 'self'",
      dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
      dev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
      "object-src 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self' ${api}${dev ? ' wss://localhost:5173' : ''}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: false,
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
    server: {
      port: 5173,
      strictPort: true,
      https,
      headers: { ...baseHeaders, 'Content-Security-Policy': cspFor(true) },
    },
    preview: {
      port: 5173,
      strictPort: true,
      https,
      headers: { ...baseHeaders, 'Content-Security-Policy': cspFor(false) },
    },
  }
})
