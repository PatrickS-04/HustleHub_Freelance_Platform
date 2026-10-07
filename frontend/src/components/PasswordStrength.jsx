import './PasswordStrength.css'

// The extra "long or symbol" step only affects the meter, not validity.
const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

function PasswordStrength({ password }) {
  if (!password) return null

  const steps = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 12 || /[^A-Za-z0-9]/.test(password),
  ]
  const score = steps.filter(Boolean).length

  return (
    <div className="strength" role="status" aria-live="polite">
      <div className="strength-bars" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={i < score ? `on level-${score}` : ''} />
        ))}
      </div>
      <span className="strength-label">{LABELS[score]}</span>
    </div>
  )
}

export default PasswordStrength
