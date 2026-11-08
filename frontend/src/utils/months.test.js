import { monthlySeries, totalsByMonth } from './months'

const now = new Date(2026, 10, 8) // 8 Nov 2026

describe('monthlySeries', () => {
  it('ends on the current month when there is no later data', () => {
    const s = monthlySeries({}, now)
    expect(s.map((m) => m.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(s.every((m) => m.value === 0)).toBe(true)
  })

  it('extends to the latest month with data and fills gaps with 0', () => {
    const s = monthlySeries({ '2027-02': 9, '2026-12': 5, '2026-09': 1 }, now)
    expect(s.map((m) => `${m.key}=${m.value}`)).toEqual([
      '2026-09=1', '2026-10=0', '2026-11=0', '2026-12=5', '2027-01=0', '2027-02=9',
    ])
    expect(s[0].label).toBe('Sep')
  })
})

describe('totalsByMonth', () => {
  it('sums prices per start month', () => {
    const bookings = [
      { date: '2026-11-20', price: 100 },
      { date: '2026-11-03', price: 50 },
      { date: '2026-12-01', price: 70 },
    ]
    expect(totalsByMonth(bookings)).toEqual({ '2026-11': 150, '2026-12': 70 })
  })
})
