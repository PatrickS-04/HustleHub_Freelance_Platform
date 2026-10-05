import { useState } from 'react'
import { register } from '../services/api'
import Select from './Select'

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client (hiring)' },
  { value: 'freelancer', label: 'Freelancer (offering services)' },
]

// Mirrors the server-side rules in API/middleware/validators.js. The server
// remains the source of truth; this just gives instant feedback.
function validate({ name, email, password }) {
  if (!/^[A-Za-z][A-Za-z '-]{1,49}$/.test(name.trim())) {
    return 'Name must be 2-50 letters.'
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return 'Enter a valid email address.'
  }
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return 'Password must be 8-128 characters with an uppercase letter, a lowercase letter and a number.'
  }
  return ''
}

function RegisterForm({ onRegister, onSwitch }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = validate(form)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await register(
        form.name.trim(),
        form.email.trim(),
        form.password,
        form.role,
      )
      onRegister(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="auth-brand">HustleHub+</p>
        <h1>Create account</h1>
        <p className="auth-subtitle">Join HustleHub+ in a few seconds.</p>

        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={update('name')}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <div className="input-wrap">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
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

        <div className="field">
          <label htmlFor="role">I am a</label>
          <Select
            id="role"
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v }))}
            options={ROLE_OPTIONS}
          />
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="link-btn" onClick={onSwitch}>
            Log in
          </button>
        </p>
      </form>
    </div>
  )
}

export default RegisterForm
