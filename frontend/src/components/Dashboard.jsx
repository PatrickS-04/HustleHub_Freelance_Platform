import { useState } from 'react'
import { logout } from '../services/api'
import { STATUS_ACTIONS, countsAsIncome, money, seedData } from '../data/placeholder'
import ThemeToggle from './ThemeToggle'
import Overview from '../screens/Overview'
import BrowseGigs from '../screens/BrowseGigs'
import ClientBookings from '../screens/ClientBookings'
import MyGigs from '../screens/MyGigs'
import FreelancerBookings from '../screens/FreelancerBookings'
import Earnings from '../screens/Earnings'
import Spending from '../screens/Spending'
import Settings from '../screens/Settings'
import AccessDenied from '../screens/AccessDenied'
import IdleWarning from './IdleWarning'
import { useIdleLogout } from '../hooks/useIdleLogout'
import { IDLE_MS, WARN_MS } from '../config'
import './Dashboard.css'

const CLIENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'browse', label: 'Browse gigs' },
  { id: 'bookings', label: 'My bookings' },
  { id: 'spending', label: 'Spending' },
  { id: 'settings', label: 'Settings' },
]
const FREELANCER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'gigs', label: 'My gigs' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'settings', label: 'Settings' },
]

function Dashboard({ user: authUser, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('overview')
  // The display name can be edited in Settings (placeholder only, no API yet).
  const [displayName, setDisplayName] = useState(authUser.name)
  const user = { ...authUser, name: displayName }
  // Placeholder state; becomes API calls once the endpoints exist.
  const [data, setData] = useState(() => seedData(authUser))

  // Unknown roles (e.g. admin) get the client view for now.
  const isFreelancer = user.role === 'freelancer'
  const tabs = isFreelancer ? FREELANCER_TABS : CLIENT_TABS

  // Only the logged-in user's own records are shown in their booking views.
  const myBookings = data.bookings.filter((b) =>
    isFreelancer ? b.freelancerId === user.id : b.clientId === user.id,
  )

  const addGig = (gig) => setData((d) => ({ ...d, gigs: [gig, ...d.gigs] }))

  // Freelancers may only change or remove their own gigs. Both return whether
  // the change was applied.
  const ownsGig = (id) => data.gigs.some((g) => g.id === id && g.freelancerId === user.id)
  function updateGig(id, patch) {
    if (!ownsGig(id)) return false
    setData((d) => ({
      ...d,
      gigs: d.gigs.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }))
    return true
  }
  function deleteGig(id) {
    if (!ownsGig(id)) return false
    setData((d) => ({ ...d, gigs: d.gigs.filter((g) => g.id !== id) }))
    return true
  }
  const addBooking = (booking) =>
    setData((d) => ({ ...d, bookings: [booking, ...d.bookings] }))

  // Renaming also updates the name stored on this user's gigs and bookings.
  function changeName(name) {
    setDisplayName(name)
    setData((d) => ({
      gigs: d.gigs.map((g) => (g.freelancerId === user.id ? { ...g, freelancerName: name } : g)),
      bookings: d.bookings.map((b) => ({
        ...b,
        clientName: b.clientId === user.id ? name : b.clientName,
        freelancerName: b.freelancerId === user.id ? name : b.freelancerName,
      })),
    }))
  }

  // A client can review their own completed booking once, with a 1-5 rating and
  // an optional short comment. Nudges the gig's rating toward the new score.
  function addReview(id, review) {
    const booking = data.bookings.find((b) => b.id === id)
    const valid =
      booking &&
      booking.clientId === user.id &&
      booking.status === 'Completed' &&
      !booking.review &&
      Number.isInteger(review.rating) &&
      review.rating >= 1 &&
      review.rating <= 5 &&
      typeof review.text === 'string' &&
      review.text.length <= 300
    if (!valid) return false
    setData((d) => ({
      gigs: d.gigs.map((g) =>
        g.id === booking.gigId
          ? { ...g, rating: Math.round(((g.rating * 9 + review.rating) / 10) * 10) / 10 }
          : g,
      ),
      bookings: d.bookings.map((b) =>
        b.id === id ? { ...b, review: { ...review, when: 'Just now' } } : b,
      ),
    }))
    return true
  }

  // Reviews left by clients, shown on each gig's detail page.
  const shortName = (full) => {
    const [first, ...rest] = full.split(' ')
    return rest.length ? `${first} ${rest[rest.length - 1].charAt(0)}.` : first
  }
  const gigReviews = data.bookings
    .filter((b) => b.review)
    .map((b) => ({
      gigId: b.gigId,
      who: shortName(b.clientName),
      rating: b.review.rating,
      text: b.review.text,
      when: b.review.when,
    }))

  // Applies a status change only if it is an allowed transition for this role
  // from the booking's current status. Returns whether it was applied.
  function updateStatus(id, to) {
    const booking = data.bookings.find((b) => b.id === id)
    const allowed = booking && (STATUS_ACTIONS[user.role === 'freelancer' ? 'freelancer' : 'client'][booking.status] || [])
    if (!allowed || !allowed.some((a) => a.to === to)) return false
    setData((d) => ({
      ...d,
      bookings: d.bookings.map((b) => (b.id === id ? { ...b, status: to } : b)),
    }))
    return true
  }

  // `reason` ('idle') tells the login screen why the user was signed out.
  async function handleLogout(reason) {
    setLoading(true)
    try {
      await logout()
    } finally {
      // Clear local state even if the request failed; the server cookie
      // expires on its own after an hour.
      onLogout(reason)
    }
  }

  // Sign out after a period of inactivity, warning shortly beforehand.
  const { secondsLeft, stay } = useIdleLogout({
    idleMs: IDLE_MS,
    warnMs: WARN_MS,
    onExpire: () => handleLogout('idle'),
  })

  let screen
  if (view === 'browse' && !isFreelancer) {
    screen = (
      <BrowseGigs
        user={user}
        gigs={data.gigs}
        reviews={gigReviews}
        nextTransactionId={`TX-${1001 + data.bookings.length}`}
        onBooked={addBooking}
      />
    )
  } else if (view === 'bookings') {
    screen = isFreelancer ? (
      <FreelancerBookings bookings={myBookings} onStatus={updateStatus} />
    ) : (
      <ClientBookings
        bookings={myBookings}
        goTo={setView}
        onStatus={updateStatus}
        onReview={addReview}
      />
    )
  } else if (view === 'settings') {
    screen = <Settings user={user} onNameChange={changeName} />
  } else if (view === 'gigs' && isFreelancer) {
    screen = (
      <MyGigs
        user={user}
        gigs={data.gigs}
        onCreate={addGig}
        onUpdate={updateGig}
        onDelete={deleteGig}
      />
    )
  } else if (view === 'spending' && !isFreelancer) {
    screen = <Spending bookings={myBookings} gigs={data.gigs} />
  } else if (view === 'earnings' && isFreelancer) {
    screen = <Earnings bookings={myBookings} />
  } else if (view === 'overview') {
    screen = (
      <Overview
        user={user}
        isFreelancer={isFreelancer}
        gigs={data.gigs}
        bookings={myBookings}
        goTo={setView}
      />
    )
  } else {
    // Any page the current role isn't allowed to see (or an unknown one).
    screen = <AccessDenied onBack={() => setView('overview')} />
  }

  const income = myBookings
    .filter(countsAsIncome)
    .reduce((sum, b) => sum + b.price, 0)
  const activeTab = tabs.find((t) => t.id === view) || tabs[0]

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="title-tab">
          <span className="dash-brand">HustleHub+</span>
          <h1 className="tab-title">{activeTab.label}</h1>
        </div>

        <nav className="pill-nav" aria-label="Main">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={view === t.id ? 'nav-pill active' : 'nav-pill'}
              aria-current={view === t.id ? 'page' : undefined}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <ThemeToggle />
          <button
            type="button"
            className="btn-outline"
            onClick={() => handleLogout()}
            disabled={loading}
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </header>

      <main className="dash-main">
        <section className="profile-strip" aria-label="Your account">
          <span className="avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="strip-id">
            <span className="strip-name">{user.name}</span>
            <span className="badge">{user.role}</span>
          </div>
          <div className="strip-stat">
            <span>{isFreelancer ? 'Bookings' : 'Booked'}</span>
            <strong>{myBookings.length}</strong>
          </div>
          <div className="strip-stat">
            <span>{isFreelancer ? 'Income' : 'Spent'}</span>
            <strong>{money(income)}</strong>
          </div>
        </section>

        {screen}
        <p className="sample-note">Showing sample data.</p>
      </main>

      {secondsLeft !== null && (
        <IdleWarning
          secondsLeft={secondsLeft}
          onStay={stay}
          onLogout={() => handleLogout()}
        />
      )}
    </div>
  )
}

export default Dashboard
