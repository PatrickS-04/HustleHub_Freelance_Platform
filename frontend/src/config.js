// Sign the user out after this much inactivity (minutes). Override with
// VITE_IDLE_MINUTES, handy for testing the timeout quickly.
const minutes = Number(import.meta.env.VITE_IDLE_MINUTES)
export const IDLE_MS = (Number.isFinite(minutes) && minutes >= 0.5 ? minutes : 15) * 60 * 1000

// How long before sign-out the "still there?" warning appears.
export const WARN_MS = Math.min(60 * 1000, IDLE_MS / 2)
