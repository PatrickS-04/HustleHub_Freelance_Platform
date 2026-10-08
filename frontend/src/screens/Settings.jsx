import { useEffect, useState } from 'react'
import { currentTheme, setTheme } from '../theme'
import PasswordStrength from '../components/PasswordStrength'
import { passwordProblem } from '../utils/password'
import { changePassword } from '../services/api'
import '../components/Bookings.css'
import './GigDetail.css'
import './Settings.css'

const NAME_RULE = /^[A-Za-z][A-Za-z '-]{1,49}$/

const NOTIFICATIONS = {
  client: [
    { id: 'status', label: 'Booking updates', hint: 'When a freelancer accepts, declines or completes a booking.' },
    { id: 'tips', label: 'Tips and offers', hint: 'Occasional ideas for finding the right freelancer.' },
  ],
  freelancer: [
    { id: 'requests', label: 'New booking requests', hint: 'When a client books one of your gigs.' },
    { id: 'reviews', label: 'New reviews', hint: 'When a client rates a completed job.' },
    { id: 'tips', label: 'Tips and offers', hint: 'Occasional ideas for growing your income.' },
  ],
}

function Settings({ user, onNameChange }) {
  const [theme, setThemeState] = useState(currentTheme)
  const [notice, setNotice] = useState('')

  const [name, setName] = useState(user.name)
  const [nameError, setNameError] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const list = NOTIFICATIONS[user.role === 'freelancer' ? 'freelancer' : 'client']
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(list.map((n) => [n.id, n.id !== 'tips'])),
  )

  // Auto-dismiss the confirmation message.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  function pickTheme(next) {
    setTheme(next)
    setThemeState(next)
  }

  // Checked here for quick feedback; the API applies the same rule again.
  async function saveName(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!NAME_RULE.test(trimmed)) {
      return setNameError('Name must be 2-50 letters (spaces, hyphens and apostrophes are fine).')
    }
    setNameError('')
    setSavingName(true)
    try {
      await onNameChange(trimmed)
      setName(trimmed)
      setNotice('Display name updated.')
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSavingName(false)
    }
  }

  // Checked here for quick feedback; the API checks the current password and
  // the same strength rule again.
  async function savePassword(e) {
    e.preventDefault()
    if (!pw.current) return setPwError('Enter your current password.')
    const problem = passwordProblem(pw.next)
    if (problem) return setPwError(problem)
    if (pw.next === pw.current) return setPwError('Choose a new password that differs from the current one.')
    if (pw.next !== pw.confirm) return setPwError('The new passwords do not match.')

    setPwError('')
    setSavingPw(true)
    try {
      const { message } = await changePassword(pw.current, pw.next)
      // Cleared once sent so the passwords aren't kept in memory.
      setPw({ current: '', next: '', confirm: '' })
      setNotice(message)
    } catch (err) {
      // Only the current password is cleared, so the new one needn't be retyped.
      setPw((p) => ({ ...p, current: '' }))
      setPwError(err.message)
    } finally {
      setSavingPw(false)
    }
  }

  const setField = (field) => (e) => setPw((p) => ({ ...p, [field]: e.target.value }))

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Settings</h1>
          <p>Appearance, your profile and account security.</p>
        </div>
      </div>

      <p className="notice" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="settings-grid">
        <div className="settings-col">
          <section className="panel">
            <h2>Appearance</h2>
            <div className="segmented" role="radiogroup" aria-label="Theme">
              {['light', 'dark'].map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  className={theme === t ? 'seg active' : 'seg'}
                  onClick={() => pickTheme(t)}
                >
                  {t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Profile</h2>
            <form onSubmit={saveName} noValidate>
              <div className="field">
                <label htmlFor="set-name">Display name</label>
                <input
                  id="set-name"
                  type="text"
                  maxLength={50}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {nameError && (
                <p className="auth-error" role="alert">
                  {nameError}
                </p>
              )}

              <dl className="facts settings-facts">
                <dt>Email</dt>
                <dd>{user.email}</dd>
                <dt>Role</dt>
                <dd className="role-cap">{user.role}</dd>
              </dl>
              <p className="muted settings-hint">Email and role can't be changed here.</p>

              <button type="submit" className="btn-primary" disabled={savingName}>
                {savingName ? 'Saving...' : 'Save name'}
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>Notifications</h2>
            <ul className="toggle-list">
              {list.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{n.label}</strong>
                    <span className="muted">{n.hint}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[n.id]}
                    aria-label={n.label}
                    className={prefs[n.id] ? 'switch on' : 'switch'}
                    onClick={() => setPrefs((p) => ({ ...p, [n.id]: !p[n.id] }))}
                  >
                    <span />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel">
          <h2>Change password</h2>
          <form onSubmit={savePassword} noValidate>
            <div className="field">
              <label htmlFor="pw-current">Current password</label>
              <input
                id="pw-current"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw.current}
                onChange={setField('current')}
              />
            </div>

            <div className="field">
              <label htmlFor="pw-new">New password</label>
              <input
                id="pw-new"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.next}
                onChange={setField('next')}
              />
              <PasswordStrength password={pw.next} />
            </div>

            <div className="field">
              <label htmlFor="pw-confirm">Confirm new password</label>
              <input
                id="pw-confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.confirm}
                onChange={setField('confirm')}
              />
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />
              Show passwords
            </label>

            {pwError && (
              <p className="auth-error" role="alert">
                {pwError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={savingPw}>
              {savingPw ? 'Updating...' : 'Update password'}
            </button>
            <p className="muted settings-hint">
              Changing your password signs you out on every other device.
            </p>
          </form>
        </section>
      </div>
    </>
  )
}

export default Settings
