import { useState } from 'react'
import { CATEGORIES, CATEGORY_OPTIONS, money } from '../data/placeholder'
import Select from '../components/Select'

const empty = {
  title: '',
  category: CATEGORIES[0],
  price: '',
  deliveryDays: '',
  description: '',
}

function validate(f) {
  const title = f.title.trim()
  const desc = f.description.trim()
  const price = Number(f.price)
  const days = Number(f.deliveryDays)
  if (title.length < 5 || title.length > 80)
    return 'Title must be 5-80 characters.'
  if (!CATEGORIES.includes(f.category)) return 'Choose a category.'
  if (!Number.isFinite(price) || price < 50 || price > 100000)
    return 'Price must be between R 50 and R 100,000.'
  if (!Number.isInteger(days) || days < 1 || days > 60)
    return 'Delivery time must be a whole number of 1-60 days.'
  if (desc.length < 20 || desc.length > 500)
    return 'Description must be 20-500 characters.'
  return ''
}

function MyGigs({ user, gigs, onCreate }) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const mine = gigs.filter((g) => g.freelancerId === user.id)
  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    const problem = validate(form)
    if (problem) return setError(problem)

    onCreate({
      id: `gig-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      deliveryDays: Number(form.deliveryDays),
      freelancerId: user.id,
      freelancerName: user.name,
      rating: 5,
    })
    setForm(empty)
    setError('')
    setCreating(false)
  }

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>My gigs</h1>
          <p>Create and manage your listings.</p>
        </div>
        {!creating && (
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            Create a gig
          </button>
        )}
      </div>

      {creating && (
        <form className="panel gig-form" onSubmit={handleSubmit} noValidate>
          <h2>New gig</h2>

          <div className="field">
            <label htmlFor="g-title">Title</label>
            <input
              id="g-title"
              type="text"
              maxLength={80}
              placeholder="I will..."
              value={form.title}
              onChange={update('title')}
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="g-cat">Category</label>
              <Select
                id="g-cat"
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div className="field">
              <label htmlFor="g-price">Price (R)</label>
              <input
                id="g-price"
                type="number"
                min="50"
                max="100000"
                inputMode="numeric"
                value={form.price}
                onChange={update('price')}
              />
            </div>
            <div className="field">
              <label htmlFor="g-days">Delivery (days)</label>
              <input
                id="g-days"
                type="number"
                min="1"
                max="60"
                inputMode="numeric"
                value={form.deliveryDays}
                onChange={update('deliveryDays')}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="g-desc">Description</label>
            <textarea
              id="g-desc"
              rows="4"
              maxLength={500}
              value={form.description}
              onChange={update('description')}
            />
            <span className="hint">{form.description.length}/500</span>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setCreating(false)
                setError('')
                setForm(empty)
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Publish gig
            </button>
          </div>
        </form>
      )}

      {mine.length === 0 ? (
        <p className="empty">You haven't created any gigs yet.</p>
      ) : (
        <div className="gig-grid">
          {mine.map((g) => (
            <article className="gig-card" key={g.id}>
              <span className="tag">{g.category}</span>
              <h3>{g.title}</h3>
              <p className="gig-desc">{g.description}</p>
              <div className="gig-foot">
                <div>
                  <strong>{money(g.price)}</strong>
                  <span className="muted"> &middot; {g.deliveryDays} days</span>
                </div>
                <span className="status status-open">Live</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export default MyGigs
