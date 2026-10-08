import { useEffect, useState } from 'react'
import { CATEGORIES, CATEGORY_OPTIONS, money } from '../constants'
import Select from '../components/Select'
import ConfirmDialog from '../components/ConfirmDialog'
import '../components/Bookings.css'
import './MyGigs.css'

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

const isActive = (g) => g.active !== false

function MyGigs({ user, gigs, onCreate, onUpdate, onDelete }) {
  // null = form closed, 'new' = creating, otherwise the id of the gig being edited
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState('')

  const mine = gigs.filter((g) => g.freelancerId === user.id)
  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  // Auto-dismiss the confirmation message.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  function closeForm() {
    setEditing(null)
    setForm(empty)
    setError('')
  }

  function startEdit(gig) {
    setForm({
      title: gig.title,
      category: gig.category,
      price: String(gig.price),
      deliveryDays: String(gig.deliveryDays),
      description: gig.description,
    })
    setError('')
    setEditing(gig.id)
    window.scrollTo({ top: 0 })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const problem = validate(form)
    if (problem) return setError(problem)

    const fields = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      deliveryDays: Number(form.deliveryDays),
    }

    if (editing === 'new') {
      onCreate({
        id: `gig-${Date.now()}`,
        ...fields,
        freelancerId: user.id,
        freelancerName: user.name,
        rating: 5,
        active: true,
      })
      setNotice('Gig published.')
    } else if (onUpdate(editing, fields)) {
      setNotice('Changes saved.')
    } else {
      setNotice('That gig could not be changed.')
    }
    closeForm()
  }

  function togglePause(gig) {
    const next = !isActive(gig)
    if (onUpdate(gig.id, { active: next })) {
      setNotice(next ? 'Gig is live again.' : 'Gig paused and hidden from clients.')
    }
  }

  const formOpen = editing !== null

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>My gigs</h1>
          <p>Create, edit, pause and remove your listings.</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setForm(empty)
              setEditing('new')
            }}
          >
            Create a gig
          </button>
        )}
      </div>

      <p className="notice" role="status" aria-live="polite">
        {notice}
      </p>

      {formOpen && (
        <form className="panel gig-form" onSubmit={handleSubmit} noValidate>
          <h2>{editing === 'new' ? 'New gig' : 'Edit gig'}</h2>

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
            <button type="button" className="btn-outline" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing === 'new' ? 'Publish gig' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {mine.length === 0 ? (
        <p className="empty">You haven't created any gigs yet.</p>
      ) : (
        <div className="gig-grid">
          {mine.map((g) => (
            <article className={isActive(g) ? 'gig-card' : 'gig-card paused'} key={g.id}>
              <span className="tag">{g.category}</span>
              <h3>{g.title}</h3>
              <p className="gig-desc">{g.description}</p>
              <div className="gig-foot">
                <div>
                  <strong>{money(g.price)}</strong>
                  <span className="muted"> &middot; {g.deliveryDays} days</span>
                </div>
                <span className={isActive(g) ? 'status status-open' : 'status status-paused'}>
                  {isActive(g) ? 'Live' : 'Paused'}
                </span>
              </div>
              <div className="gig-manage">
                <button type="button" className="btn-outline" onClick={() => startEdit(g)}>
                  Edit
                </button>
                <button type="button" className="btn-outline" onClick={() => togglePause(g)}>
                  {isActive(g) ? 'Pause' : 'Resume'}
                </button>
                <button type="button" className="btn-outline danger-text" onClick={() => setDeleting(g)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete "${deleting.title}"? Existing bookings keep their records, but clients will no longer see this gig.`}
          confirmLabel="Delete gig"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (onDelete(deleting.id)) setNotice('Gig deleted.')
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}

export default MyGigs
