import { useEffect, useRef, useState } from 'react'
import './Select.css'
import './DatePicker.css'

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toISO = (date) => iso(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (s, n) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
// Month arithmetic that clamps (31 Jan + 1 month = 28/29 Feb, not March).
const addMonths = (s, n) => {
  const d = parse(s)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return toISO(d)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pretty = (s) =>
  parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Calendar dropdown styled to match the rest of the app (a native date input
// opens a browser-drawn picker that can't be themed). Values are YYYY-MM-DD.
function DatePicker({ id, value, onChange, min, placeholder = 'Select a date' }) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(value || min)
  const [today] = useState(() => toISO(new Date()))
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  const view = parse(focus)
  const viewYear = view.getFullYear()
  const viewMonth = view.getMonth()

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keep keyboard focus on the focused day while the calendar is open.
  useEffect(() => {
    if (!open) return
    wrapRef.current?.querySelector(`[data-date="${focus}"]`)?.focus()
  }, [open, focus])

  function toggle() {
    if (open) return setOpen(false)
    setFocus(value || min)
    setOpen(true)
  }

  function choose(date) {
    if (date < min) return
    onChange(date)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function move(next) {
    setFocus(next < min ? min : next)
  }

  function handleKeyDown(e) {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in steps) {
      e.preventDefault()
      move(addDays(focus, steps[e.key]))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      move(addMonths(focus, e.key === 'PageUp' ? -1 : 1))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(viewYear, viewMonth, i + 1)),
  ]
  const atMinMonth = min.slice(0, 7) >= iso(viewYear, viewMonth, 1).slice(0, 7)

  return (
    <div className="select dp" ref={wrapRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="select-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={value ? '' : 'dp-placeholder'}>
          {value ? pretty(value) : placeholder}
        </span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dp-icon">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div
          className="dp-pop"
          role="dialog"
          aria-label="Choose a date"
          onKeyDown={handleKeyDown}
        >
          <div className="dp-head">
            <button
              type="button"
              className="dp-nav"
              aria-label="Previous month"
              disabled={atMinMonth}
              onClick={() => move(addMonths(focus, -1))}
            >
              &#8249;
            </button>
            <strong aria-live="polite">
              {MONTHS[viewMonth]} {viewYear}
            </strong>
            <button
              type="button"
              className="dp-nav"
              aria-label="Next month"
              onClick={() => move(addMonths(focus, 1))}
            >
              &#8250;
            </button>
          </div>

          <div className="dp-grid" role="grid">
            {DOW.map((d) => (
              <span key={d} className="dp-dow" role="columnheader">
                {d}
              </span>
            ))}
            {cells.map((date, i) =>
              date ? (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  tabIndex={date === focus ? 0 : -1}
                  disabled={date < min}
                  aria-label={pretty(date)}
                  aria-pressed={date === value}
                  className={
                    'dp-day' +
                    (date === value ? ' selected' : '') +
                    (date === today ? ' today' : '')
                  }
                  onClick={() => choose(date)}
                >
                  {Number(date.slice(8))}
                </button>
              ) : (
                <span key={`blank-${i}`} />
              ),
            )}
          </div>

          {today >= min && (
            <button type="button" className="dp-today" onClick={() => choose(today)}>
              Today
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default DatePicker
