import { useEffect, useRef, useState } from 'react'
import { login } from '../services/api'

// A UX deterrent only: the API enforces the real rate limit. After this many
// failures in a row, or any 429, the button pauses for a short cooldown.
const MAX_FAILURES = 5
const COOLDOWN_SECONDS = 30

function LoginForm({ onLogin, onSwitch, notice }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // Set once the password was accepted but the account needs a code as well.
  const [needsCode, setNeedsCode] = useState(false)
  const [code, setCode] = useState('')
  const failures = useRef(0)
  const codeInput = useRef(null)

  // The code field only appears after the user submits their password, and the
  // password field it replaces is gone, so focus is moved to it here. This is a
  // response to the user's action, not autofocus on page load (Sonar S9379).
  useEffect(() => {
    if (needsCode) codeInput.current?.focus()
  }, [needsCode])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function backToPassword() {
    setNeedsCode(false)
    setCode('')
    setPassword('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (cooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const data = needsCode
        ? await login(email.trim(), password, code.trim())
        : await login(email.trim(), password)
      failures.current = 0
      if (data.mfaRequired) {
        setNeedsCode(true)
        return
      }
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
      // Never leave a rejected password sitting in the form. At the code step the
      // password was accepted and is needed for the next try, so only the code goes.
      if (needsCode) setCode('')
      else setPassword('')
      failures.current += 1
      if (err.status === 429 || failures.current >= MAX_FAILURES) {
        failures.current = 0
        setCooldown(COOLDOWN_SECONDS)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="auth-brand">HustleHub+</p>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Log in to your account to continue.</p>

        {notice && (
          <p className="auth-info" role="status">
            {notice}
          </p>
        )}

        {needsCode ? (
          <div className="field">
            <label htmlFor="mfa-code">Authentication code</label>
            <input
              id="mfa-code"
              type="text"
              autoComplete="one-time-code"
              maxLength={20}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              ref={codeInput}
              required
            />
            <p className="muted">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={128}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={loading || cooldown > 0}>
          {loading
            ? 'Logging in...'
            : cooldown > 0
              ? `Try again in ${cooldown}s`
              : needsCode
                ? 'Verify'
                : 'Log in'}
        </button>

        {needsCode ? (
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={backToPassword}>
              Back to login
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            New here?{' '}
            <button type="button" className="link-btn" onClick={onSwitch}>
              Create an account
            </button>
          </p>
        )}
      </form>
    </div>
  )
}

export default LoginForm
