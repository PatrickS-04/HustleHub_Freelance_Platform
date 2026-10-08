// Placeholder data for the marketplace screens. Replace with API calls once the
// gig / booking / transaction endpoints exist. Shapes mirror what those would return.

// Placeholder income for the five months before the current one (oldest first).
// Real bookings are added on top of this by month in the Earnings chart.
export const INCOME_HISTORY = [2900, 3400, 3100, 4600, 4000]

// Same idea for a client's spending.
export const SPEND_HISTORY = [1500, 2200, 1800, 3100, 2600]

export const activityFor = (isFreelancer) =>
  isFreelancer
    ? [
        { who: 'Palesa Nkosi', text: 'booked "I will build your small business website"', when: '2h' },
        { who: 'Johan Venter', text: 'marked your Node.js bug fix as complete', when: '1d' },
        { who: 'HustleHub+', text: 'A payment of R 1,800 was added to your earnings', when: '1d' },
        { who: 'Nomsa Zulu', text: 'left you a 5-star review', when: '3d' },
      ]
    : [
        { who: 'Thandi Mokoena', text: 'accepted your logo booking', when: '2h' },
        { who: 'Anele Pretorius', text: 'delivered your blog posts', when: '1d' },
        { who: 'HustleHub+', text: 'Your booking TX-1001 was confirmed', when: '1d' },
        { who: 'Lerato Dlamini', text: 'published a new gig: social media content', when: '3d' },
      ]
