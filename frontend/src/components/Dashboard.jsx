import { useState } from 'react'
import { logout } from '../services/api'
import { dashboardData } from '../data/placeholder'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false)
  // Unknown roles (e.g. admin) fall back to the client view for now.
  const data = dashboardData[user.role] || dashboardData.client
  const isFreelancer = user.role === 'freelancer'

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

      <main className="dash-main">
        <div className="dash-title-row">
          <div>
            <h1>Hello, {user.name}</h1>
            <p>
              {isFreelancer
                ? "Here's what's happening with your work."
                : "Here's what's happening with your jobs."}
            </p>
          </div>
          <button type="button" className="btn-primary">
            {isFreelancer ? 'Browse jobs' : 'Post a job'}
          </button>
        </div>

        <section className="stats" aria-label="Summary">
          {data.stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </section>

        <div className="dash-grid">
          <section className="panel">
            <h2>{data.listTitle}</h2>
            <ul className="job-list">
              {data.items.map((job) => (
                <li className="job" key={job.id}>
                  <div className="job-top">
                    <h3>{job.title}</h3>
                    <span
                      className={`status status-${job.status
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="job-meta">
                    <span>{job.meta}</span>
                    <span className="job-budget">{job.budget}</span>
                  </div>
                  <div className="tags">
                    {job.tags.map((t) => (
                      <span className="tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="dash-side">
            <section className="panel">
              <h2>Recent activity</h2>
              <ul className="activity">
                {data.activity.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <h2>Your profile</h2>
              <dl className="profile">
                <dt>Email</dt>
                <dd>{user.email}</dd>
                <dt>Role</dt>
                <dd className="role-badge">{user.role}</dd>
              </dl>
            </section>
          </aside>
        </div>

        <p className="sample-note">Showing sample data.</p>
      </main>
    </div>
  )
}

export default Dashboard
