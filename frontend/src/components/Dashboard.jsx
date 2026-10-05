import { useState } from 'react'
import { logout } from '../services/api'
import { seedData } from '../data/placeholder'
import Overview from '../screens/Overview'
import BrowseGigs from '../screens/BrowseGigs'
import ClientBookings from '../screens/ClientBookings'
import MyGigs from '../screens/MyGigs'
import FreelancerBookings from '../screens/FreelancerBookings'
import Earnings from '../screens/Earnings'
import './Dashboard.css'

const CLIENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'browse', label: 'Browse gigs' },
  { id: 'bookings', label: 'My bookings' },
]
const FREELANCER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'gigs', label: 'My gigs' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'earnings', label: 'Earnings' },
]

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('overview')
  // Placeholder state; becomes API calls once the endpoints exist.
  const [data, setData] = useState(() => seedData(user))

  // Unknown roles (e.g. admin) get the client view for now.
  const isFreelancer = user.role === 'freelancer'
  const tabs = isFreelancer ? FREELANCER_TABS : CLIENT_TABS

  // Only the logged-in user's own records are shown in their booking views.
  const myBookings = data.bookings.filter((b) =>
    isFreelancer ? b.freelancerId === user.id : b.clientId === user.id,
  )

  const addGig = (gig) => setData((d) => ({ ...d, gigs: [gig, ...d.gigs] }))
  const addBooking = (booking) =>
    setData((d) => ({ ...d, bookings: [booking, ...d.bookings] }))

  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } finally {
      // Clear local state even if the request failed; the server cookie
      // expires on its own after an hour.
      onLogout()
    }
  }

  let screen
  if (view === 'browse' && !isFreelancer) {
    screen = (
      <BrowseGigs
        user={user}
        gigs={data.gigs}
        nextTransactionId={`TX-${1001 + data.bookings.length}`}
        onBooked={addBooking}
      />
    )
  } else if (view === 'bookings') {
    screen = isFreelancer ? (
      <FreelancerBookings bookings={myBookings} />
    ) : (
      <ClientBookings bookings={myBookings} goTo={setView} />
    )
  } else if (view === 'gigs' && isFreelancer) {
    screen = <MyGigs user={user} gigs={data.gigs} onCreate={addGig} />
  } else if (view === 'earnings' && isFreelancer) {
    screen = <Earnings bookings={myBookings} />
  } else {
    screen = (
      <Overview
        user={user}
        isFreelancer={isFreelancer}
        gigs={data.gigs}
        bookings={myBookings}
        goTo={setView}
      />
    )
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <span className="dash-brand">HustleHub+</span>
        <div className="dash-user">
          <span className="dash-user-name">{user.name}</span>
          <span className="badge">{user.role}</span>
          <button
            type="button"
            className="btn-outline"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </header>

      <nav className="dash-nav" aria-label="Main">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={view === t.id ? 'nav-tab active' : 'nav-tab'}
            aria-current={view === t.id ? 'page' : undefined}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {screen}
        <p className="sample-note">Showing sample data.</p>
      </main>
    </div>
  )
}

export default Dashboard
