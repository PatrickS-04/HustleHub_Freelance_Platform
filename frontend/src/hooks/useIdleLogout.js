import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

// Tracks user activity. After `idleMs` without any it calls `onExpire`; for
// the last `warnMs` it reports `warning` plus a countdown so the UI can offer
// "stay signed in". Once the warning shows, only `stay()` resets the timer, so
// stray mouse movement can't silently dismiss it.
export function useIdleLogout({ idleMs, warnMs, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const lastActive = useRef(0)
  const warning = useRef(false)
  const expire = useRef(onExpire)

  useEffect(() => {
    expire.current = onExpire
  }, [onExpire])

  const stay = useCallback(() => {
    lastActive.current = Date.now()
    warning.current = false
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    lastActive.current = Date.now()

    const onActivity = () => {
      if (!warning.current) lastActive.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    const timer = setInterval(() => {
      const idle = Date.now() - lastActive.current
      if (idle >= idleMs) {
        clearInterval(timer)
        expire.current()
      } else if (idle >= idleMs - warnMs) {
        warning.current = true
        setSecondsLeft(Math.ceil((idleMs - idle) / 1000))
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [idleMs, warnMs])

  return { secondsLeft, stay }
}
