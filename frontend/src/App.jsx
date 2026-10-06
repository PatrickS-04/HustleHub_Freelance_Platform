import { useEffect, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'
import { getMe, setUnauthorizedHandler } from './services/api'
import './App.css'

// Why the user ended up back on the login screen (shown above the form).
const SIGNED_OUT_NOTICE = {
  idle: 'You were signed out because of inactivity. Please log in again.',
  expired: 'Your session expired. Please log in again.',
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('login')
  const [notice, setNotice] = useState('')

  // If the auth cookie is still valid, restore the session on page load.
  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  // Any authenticated request that comes back 401 means the session is gone.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setView('login')
      setNotice(SIGNED_OUT_NOTICE.expired)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  function signedIn(u) {
    setNotice('')
    setUser(u)
  }

  if (checking) return <p className="welcome">Loading...</p>

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={(reason) => {
          setUser(null)
          setView('login')
          setNotice(SIGNED_OUT_NOTICE[reason] || '')
        }}
      />
    )
  }

  return (
    <>
      <ThemeToggle className="theme-float" />
      {view === 'register' ? (
        <RegisterForm onRegister={signedIn} onSwitch={() => setView('login')} />
      ) : (
        <LoginForm
          onLogin={signedIn}
          onSwitch={() => setView('register')}
          notice={notice}
        />
      )}
    </>
  )
}

export default App
