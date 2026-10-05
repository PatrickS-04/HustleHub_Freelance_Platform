// Placeholder data until the API has job/gig endpoints. Shaped per role so the
// dashboard can swap in real fetches later without changing the components.

export const dashboardData = {
  client: {
    stats: [
      { label: 'Active jobs', value: '3' },
      { label: 'Proposals received', value: '18' },
      { label: 'Total spent', value: 'R 24,500' },
      { label: 'Completed jobs', value: '9' },
    ],
    listTitle: 'Your posted jobs',
    items: [
      {
        id: 1,
        title: 'Logo and brand identity for a coffee shop',
        meta: '7 proposals',
        budget: 'R 4,500',
        status: 'Open',
        tags: ['Design', 'Branding'],
      },
      {
        id: 2,
        title: 'Build a landing page in React',
        meta: '5 proposals',
        budget: 'R 8,000',
        status: 'In progress',
        tags: ['Web', 'React'],
      },
      {
        id: 3,
        title: 'Product photography - 20 items',
        meta: '6 proposals',
        budget: 'R 3,200',
        status: 'Open',
        tags: ['Photography'],
      },
      {
        id: 4,
        title: 'Monthly social media content',
        meta: 'Hired: Thandi M.',
        budget: 'R 2,800',
        status: 'Completed',
        tags: ['Marketing'],
      },
    ],
    activity: [
      'Sipho K. sent a proposal on "Logo and brand identity"',
      'Landing page milestone 2 was marked complete',
      'You posted "Product photography - 20 items"',
      'Payment of R 2,800 released to Thandi M.',
    ],
  },
  freelancer: {
    stats: [
      { label: 'Active contracts', value: '2' },
      { label: 'Proposals sent', value: '11' },
      { label: 'Earnings (month)', value: 'R 12,300' },
      { label: 'Rating', value: '4.8 / 5' },
    ],
    listTitle: 'Recommended jobs',
    items: [
      {
        id: 1,
        title: 'Logo and brand identity for a coffee shop',
        meta: 'Posted 2 hours ago',
        budget: 'R 4,500',
        status: 'Open',
        tags: ['Design', 'Branding'],
      },
      {
        id: 2,
        title: 'Mobile app UI kit (Figma)',
        meta: 'Posted yesterday',
        budget: 'R 6,000',
        status: 'Open',
        tags: ['UI/UX', 'Figma'],
      },
      {
        id: 3,
        title: 'Fix checkout bugs on a Node.js store',
        meta: 'Posted 2 days ago',
        budget: 'R 5,200',
        status: 'Open',
        tags: ['Node.js', 'Bug fix'],
      },
      {
        id: 4,
        title: 'Translate website copy (EN to AF)',
        meta: 'Posted 3 days ago',
        budget: 'R 1,900',
        status: 'Open',
        tags: ['Writing'],
      },
    ],
    activity: [
      'Your proposal on "Mobile app UI kit" was viewed',
      'New message from Anele P.',
      'Contract "Landing page" reached milestone 2',
      'Payment of R 4,100 was received',
    ],
  },
}
