import { useEffect, useState } from 'react'
import * as api from '../services/api'
import { countsAsIncome, money } from '../constants'
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
  // Gigs: a freelancer gets their own (paused ones too), everyone else gets the
  // live gigs they can browse. Bookings: the API only ever returns the user's
  // own (clients: ones they made, freelancers: ones on their gigs).
  const [gigs, setGigs] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Unknown roles (e.g. admin) get the client view for now.
  const isFreelancer = user.role === 'freelancer'
  const tabs = isFreelancer ? FREELANCER_TABS : CLIENT_TABS
  // GET /api/bookings/mine is for clients and freelancers only (403 otherwise).
  const hasBookings = user.role === 'client' || isFreelancer

  useEffect(() => {
    Promise.all([
      isFreelancer ? api.listMyGigs() : api.listGigs(),
      hasBookings ? api.listMyBookings() : [],
    ])
      .then(([g, b]) => {
        setGigs(g)
        setBookings(b)
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingData(false))
  }, [isFreelancer, hasBookings])

  // Gig changes go to the API first; local state only updates once it succeeds.
  // Ownership is checked by the API (403 for someone else's gig). Errors are
  // thrown so the screen can show the API's message.
  async function addGig(fields) {
    const gig = await api.createGig(fields)
    setGigs((gs) => [gig, ...gs])
  }
  async function updateGig(id, patch) {
    const gig = await api.updateGig(id, patch)
    setGigs((gs) => gs.map((g) => (g.id === id ? gig : g)))
  }
  async function deleteGig(id) {
    await api.deleteGig(id)
    setGigs((gs) => gs.filter((g) => g.id !== id))
  }
  // The booking (and its transaction) was already created by the API.
  const addBooking = (booking) => setBookings((bs) => [booking, ...bs])
  const replaceBooking = (booking) =>
    setBookings((bs) => bs.map((b) => (b.id === booking.id ? booking : b)))

  // Renaming also updates the name stored on this user's gigs and bookings.
  function changeName(name) {
    setDisplayName(name)
    setGigs((gs) => gs.map((g) => (g.freelancerId === user.id ? { ...g, freelancerName: name } : g)))
    setBookings((bs) =>
      bs.map((b) => ({
        ...b,
        clientName: b.clientId === user.id ? name : b.clientName,
        freelancerName: b.freelancerId === user.id ? name : b.freelancerName,
      })),
    )
  }

  // A client can review their own completed booking once. The API checks the
  // rating, the owner, the status and that it hasn't been reviewed already.
  async function addReview(id, review) {
    replaceBooking(await api.reviewBooking(id, review.rating, review.text))
  }

  // Reviews left by clients, shown on each gig's detail page.
  const shortName = (full) => {
    const [first, ...rest] = full.split(' ')
    return rest.length ? `${first} ${rest[rest.length - 1].charAt(0)}.` : first
  }
  const gigReviews = bookings
    .filter((b) => b.review)
    .map((b) => ({
      gigId: b.gigId,
      who: shortName(b.clientName),
      rating: b.review.rating,
      text: b.review.text,
      when: new Date(b.review.createdAt).toLocaleDateString('en-ZA'),
    }))

  // The API decides whether this role may make this change from the booking's
  // current status (409 with a reason if not). Errors go back to the screen.
  async function updateStatus(id, to) {
    replaceBooking(await api.updateBookingStatus(id, to))
  }

  // `reason` ('idle') tells the login screen why the user was signed out.
  async function handleLogout(reason) {
    setLoading(true)
    try {
      await api.logout()
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
  if (loadingData && view !== 'settings') {
    screen = <p className="empty">Loading...</p>
  } else if (view === 'browse' && !isFreelancer) {
    screen = (
      <BrowseGigs user={user} gigs={gigs} reviews={gigReviews} onBooked={addBooking} />
    )
  } else if (view === 'bookings') {
    screen = isFreelancer ? (
      <FreelancerBookings bookings={bookings} onStatus={updateStatus} />
    ) : (
      <ClientBookings
        bookings={bookings}
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
        gigs={gigs}
        onCreate={addGig}
        onUpdate={updateGig}
        onDelete={deleteGig}
      />
    )
  } else if (view === 'spending' && !isFreelancer) {
    screen = <Spending bookings={bookings} gigs={gigs} />
  } else if (view === 'earnings' && isFreelancer) {
    screen = <Earnings />
  } else if (view === 'overview') {
    screen = (
      <Overview
        user={user}
        isFreelancer={isFreelancer}
        gigs={gigs}
        bookings={bookings}
        goTo={setView}
      />
    )
  } else {
    // Any page the current role isn't allowed to see (or an unknown one).
    screen = <AccessDenied onBack={() => setView('overview')} />
  }

  const income = bookings
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
            <strong>{bookings.length}</strong>
          </div>
          <div className="strip-stat">
            <span>{isFreelancer ? 'Income' : 'Spent'}</span>
            <strong>{money(income)}</strong>
          </div>
        </section>

        {loadError && (
          <p className="auth-error" role="alert">
            {loadError}
          </p>
        )}
        {screen}
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
