import { vi } from 'vitest'
import { ApiError, getMe, login, listGigs, setUnauthorizedHandler } from './api'

function respond(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('api client', () => {
  afterEach(() => {
    setUnauthorizedHandler(null)
    vi.restoreAllMocks()
  })

  it('sends credentials as JSON with the cookie included', async () => {
    respond(200, { user: { id: '1' } })
    await login('a@b.co', 'Passw0rd1')
    const [url, options] = fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.co', password: 'Passw0rd1' })
  })

  it('shows the API message for 4xx errors', async () => {
    respond(401, { error: 'Invalid email or password.' })
    await expect(login('a@b.co', 'x')).rejects.toMatchObject({
      message: 'Invalid email or password.',
      status: 401,
    })
  })

  it('maps 429 to a friendly rate-limit message', async () => {
    respond(429, { error: 'Too many login attempts, please try again in 15 minutes.' })
    await expect(login('a@b.co', 'x')).rejects.toThrow('Too many attempts. Please wait a moment and try again.')
  })

  it('never shows server internals for 5xx errors', async () => {
    respond(500, { error: 'MongoServerError: connection refused at /app/db.js:12' })
    const err = await login('a@b.co', 'x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('Something went wrong on our side. Please try again.')
    expect(err.message).not.toMatch(/Mongo|\/app/)
  })

  it('reports an unreachable server', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(login('a@b.co', 'x')).rejects.toMatchObject({
      message: 'Cannot reach the server. Please try again.',
      status: 0,
    })
  })

  it('signs the user out when a protected request returns 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    respond(401, { error: 'Invalid or expired token.' })
    await expect(listGigs()).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not sign out on a 401 from login or the startup session check', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    respond(401, { error: 'Authentication required.' })
    await expect(getMe()).rejects.toThrow()
    await expect(login('a@b.co', 'x')).rejects.toThrow()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
