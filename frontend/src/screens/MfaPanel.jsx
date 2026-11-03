import { useState } from 'react'
import { mfaDisable, mfaEnable, mfaSetup } from '../services/api'

// Two-factor authentication in Settings. Turning it on takes the password, then
// a code from the app, and ends by showing the recovery codes once.
function MfaPanel({ enabled, isAdmin, onChange }) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState(null)
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // The password and code are cleared either way, so they aren't kept in memory.
  async function submit(e, action) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(err.message)
    } finally {
      setPassword('')
      setCode('')
      setBusy(false)
    }
  }

  const start = (e) => submit(e, async () => setSetup(await mfaSetup(password)))

  const confirm = (e) =>
    submit(e, async () => {
      const data = await mfaEnable(code.trim())
      setSetup(null)
      setRecoveryCodes(data.recoveryCodes)
      onChange(true)
    })

  const turnOff = (e) =>
    submit(e, async () => {
      await mfaDisable(password, code.trim())
      onChange(false)
    })

  const errorLine = error && (
    <p className="auth-error" role="alert">
      {error}
    </p>
  )

  const passwordField = (
    <div className="field">
      <label htmlFor="mfa-password">Password</label>
      <input
        id="mfa-password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </div>
  )

  const codeField = (label) => (
    <div className="field">
      <label htmlFor="mfa-setting-code">{label}</label>
      <input
        id="mfa-setting-code"
        type="text"
        autoComplete="one-time-code"
        maxLength={20}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </div>
  )

  let body
  if (recoveryCodes) {
    body = (
      <>
        <p>
          <strong>Save these recovery codes somewhere safe.</strong> Each one works once if you lose your
          phone, and they won't be shown again.
        </p>
        <ul className="mfa-codes">
          {recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button type="button" className="btn-primary" onClick={() => setRecoveryCodes(null)}>
          I've saved them
        </button>
      </>
    )
  } else if (enabled) {
    body = (
      <form onSubmit={turnOff} noValidate>
        <p className="muted settings-hint">
          Two-factor authentication is on. You'll need a code from your app each time you log in.
          {isAdmin && ' Turning it off locks admin features until you turn it on again.'}
        </p>
        {passwordField}
        {codeField('Authentication or recovery code')}
        {errorLine}
        <button type="submit" className="btn-outline" disabled={busy}>
          {busy ? 'Turning off...' : 'Turn off'}
        </button>
      </form>
    )
  } else if (setup) {
    body = (
      <form onSubmit={confirm} noValidate>
        <p className="muted settings-hint">
          Scan this with an authenticator app, then enter the 6-digit code it shows.
        </p>
        <img className="mfa-qr" src={setup.qrCode} alt="QR code for your authenticator app" />
        <p className="muted settings-hint">
          Can't scan it? Enter this key instead: <code className="mfa-secret">{setup.secret}</code>
        </p>
        {codeField('6-digit code')}
        {errorLine}
        <div className="mfa-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Checking...' : 'Turn on'}
          </button>
          <button type="button" className="btn-outline" onClick={() => setSetup(null)}>
            Cancel
          </button>
        </div>
      </form>
    )
  } else {
    body = (
      <form onSubmit={start} noValidate>
        <p className="muted settings-hint">
          {isAdmin
            ? 'Admin features stay locked until this is on. You will need an authenticator app on your phone.'
            : 'Protect your account with a code from an authenticator app on your phone.'}
        </p>
        {passwordField}
        {errorLine}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Checking...' : 'Set up'}
        </button>
      </form>
    )
  }

  return (
    <section className="panel">
      <h2>Two-factor authentication</h2>
      {body}
    </section>
  )
}

export default MfaPanel
