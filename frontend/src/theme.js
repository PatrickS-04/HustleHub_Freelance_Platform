const KEY = 'hh-theme'

// Light is the default look; a saved choice wins. Storage can be blocked
// (private mode), so every access is wrapped.
export function initTheme() {
  let theme = 'light'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch {
    // ignore - fall back to light
  }
  document.documentElement.dataset.theme = theme
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // ignore - theme still applies for this session
  }
}
