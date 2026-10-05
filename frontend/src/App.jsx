import { useEffect, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard from './components/Dashboard'
import { getMe } from './services/api'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('login')

  // If the auth cookie is still valid, restore the session on page load.
  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) return <p className="welcome">Loading...</p>

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={() => {
          setUser(null)
          setView('login')
        }}
      />
    )
  }

  return view === 'register' ? (
    <RegisterForm onRegister={setUser} onSwitch={() => setView('login')} />
  ) : (
    <LoginForm onLogin={setUser} onSwitch={() => setView('register')} />
  )
}

export default App
