import { useEffect, useState } from 'react'
import LoginForm from './components/LoginForm'
import { getMe } from './services/api'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // If the auth cookie is still valid, restore the session on page load.
  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) return <p>Loading...</p>

  if (!user) return <LoginForm onLogin={setUser} />

  return (
    <section className="welcome">
      <h1>Welcome{user.name ? `, ${user.name}` : ''}</h1>
      <p>Signed in as {user.email} ({user.role})</p>
    </section>
  )
}

export default App
