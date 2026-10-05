import { useEffect, useId, useRef, useState } from 'react'
import './Select.css'

// Custom dropdown so the open list can match the glass theme (a native
// <select> list is drawn by the browser and can't be styled).
// options: [{ value, label }]. onChange receives the chosen value.
function Select({ id, value, onChange, options, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const listId = useId()

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const selected = options[selectedIndex]

  // Close when clicking anywhere outside the dropdown.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function openMenu() {
    setActive(selectedIndex)
    setOpen(true)
  }

  function choose(index) {
    onChange(options[index].value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    const last = options.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openMenu()
        else setActive((i) => Math.min(i + 1, last))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openMenu()
        else setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActive(last)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) choose(active)
        else openMenu()
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
    }
  }

  return (
    <div className={`select ${className}`} ref={wrapRef}>
      <button
        id={id}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label}</span>
        <svg
          className={open ? 'chevron open' : 'chevron'}
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="select-menu" role="listbox" id={listId}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`select-option${i === active ? ' active' : ''}${
                o.value === value ? ' selected' : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Select
