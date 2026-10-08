// Placeholder data for the marketplace screens. Replace with API calls once the
// gig / booking / transaction endpoints exist. Shapes mirror what those would return.

const otherGigs = [
  {
    id: 'g1',
    title: 'I will design a modern logo and brand kit',
    description:
      'Three logo concepts, colour palette and typography guide delivered as PNG, SVG and PDF. Two rounds of revisions included.',
    category: 'Design',
    price: 1800,
    deliveryDays: 5,
    freelancerId: 'f-thandi',
    freelancerName: 'Thandi Mokoena',
    rating: 4.9,
  },
  {
    id: 'g2',
    title: 'I will build a responsive React landing page',
    description:
      'A fast, accessible single-page site built with React and deployed for you. Includes contact form and basic SEO.',
    category: 'Web Development',
    price: 4500,
    deliveryDays: 7,
    freelancerId: 'f-sipho',
    freelancerName: 'Sipho Khumalo',
    rating: 4.8,
  },
  {
    id: 'g3',
    title: 'I will write SEO blog posts for your business',
    description:
      'Four researched, original 800-word articles written in your brand voice with keyword optimisation.',
    category: 'Writing',
    price: 1200,
    deliveryDays: 4,
    freelancerId: 'f-anele',
    freelancerName: 'Anele Pretorius',
    rating: 4.7,
  },
  {
    id: 'g4',
    title: 'I will run your social media content for a month',
    description:
      'Twelve designed posts, captions and a posting schedule across Instagram and Facebook.',
    category: 'Marketing',
    price: 2800,
    deliveryDays: 10,
    freelancerId: 'f-lerato',
    freelancerName: 'Lerato Dlamini',
    rating: 4.6,
  },
  {
    id: 'g5',
    title: 'I will shoot and edit product photos',
    description:
      'Up to 20 products photographed on a clean background and retouched. Web-ready files delivered.',
    category: 'Photography',
    price: 3200,
    deliveryDays: 6,
    freelancerId: 'f-bheki',
    freelancerName: 'Bheki Naidoo',
    rating: 5.0,
  },
  {
    id: 'g6',
    title: 'I will edit your YouTube or promo video',
    description:
      'Cuts, colour correction, captions and music for videos up to 10 minutes long.',
    category: 'Video',
    price: 2200,
    deliveryDays: 5,
    freelancerId: 'f-zanele',
    freelancerName: 'Zanele Botha',
    rating: 4.8,
  },
  {
    id: 'g7',
    title: 'I will translate your website (EN to AF)',
    description:
      'Natural, native-quality Afrikaans translation of up to 2,000 words with a consistency check.',
    category: 'Translation',
    price: 1500,
    deliveryDays: 3,
    freelancerId: 'f-anele',
    freelancerName: 'Anele Pretorius',
    rating: 4.7,
  },
  {
    id: 'g8',
    title: 'I will create a mobile app UI kit in Figma',
    description:
      'Ten polished screens with reusable components and a clickable prototype.',
    category: 'Design',
    price: 5200,
    deliveryDays: 9,
    freelancerId: 'f-thandi',
    freelancerName: 'Thandi Mokoena',
    rating: 4.9,
  },
]

// ---- Gig detail extras (placeholder) ----
// Deterministic so a gig always shows the same details between renders.
const hash = (s) => [...String(s)].reduce((n, c) => n + c.charCodeAt(0), 0)

const INCLUDES = {
  Design: ['Source files (SVG, PDF)', 'Print and web ready exports', 'Colour palette and fonts', 'Commercial usage rights'],
  'Web Development': ['Responsive mobile-friendly layout', 'Clean, documented code', 'Basic SEO setup', 'Help with going live'],
  Writing: ['Original, plagiarism-free text', 'Keyword research', 'Proofreading and edits', 'Delivered in Word or Google Docs'],
  Marketing: ['Content calendar', 'Captions and hashtags', 'Branded post designs', 'Monthly summary report'],
  Photography: ['Edited high-resolution images', 'Web-optimised copies', 'Background clean-up', 'Licence for commercial use'],
  Video: ['Cuts, transitions and colour grading', 'Captions and subtitles', 'Licensed background music', 'Export for web and social'],
  Translation: ['Native-quality translation', 'Consistency and terminology check', 'Formatting preserved', 'One free correction round'],
}

const REVIEW_POOL = [
  { who: 'Mpho S.', rating: 5, text: 'Fast, friendly and exactly what I asked for. Would book again.', when: '2 weeks ago' },
  { who: 'Karabo L.', rating: 5, text: 'Great communication throughout and delivered a day early.', when: '1 month ago' },
  { who: 'Ruan D.', rating: 4, text: 'Good quality work. A couple of small tweaks needed but sorted quickly.', when: '2 months ago' },
  { who: 'Naledi P.', rating: 5, text: 'Really professional. The result looked better than I imagined.', when: '3 months ago' },
]

export function gigDetails(gig) {
  const h = hash(gig.id + gig.freelancerId)
  return {
    included: INCLUDES[gig.category] || INCLUDES.Design,
    revisions: 1 + (h % 3),
    reviews: [0, 1, 2].map((i) => REVIEW_POOL[(h + i) % REVIEW_POOL.length]),
    freelancer: {
      memberSince: 2022 + (h % 4),
      completed: 18 + (h % 90),
      response: `${1 + (h % 5)} hours`,
    },
  }
}

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

// Builds the starting gigs + bookings for whoever is logged in so each role
// has something realistic to look at.
export function seedData(user) {
  const isFreelancer = user.role === 'freelancer'

  const ownGigs = isFreelancer
    ? [
        {
          id: 'own1',
          title: 'I will build your small business website',
          description:
            'A clean five-page website with contact form, mobile friendly and ready to launch.',
          category: 'Web Development',
          price: 6500,
          deliveryDays: 10,
          freelancerId: user.id,
          freelancerName: user.name,
          rating: 4.8,
        },
        {
          id: 'own2',
          title: 'I will fix bugs in your Node.js app',
          description:
            'Debugging and clean-up of Express APIs, with a short write-up of what was wrong.',
          category: 'Web Development',
          price: 1800,
          deliveryDays: 3,
          freelancerId: user.id,
          freelancerName: user.name,
          rating: 4.9,
        },
      ]
    : []

  const gigs = [...ownGigs, ...otherGigs]

  const bookings = isFreelancer
    ? [
        {
          id: 'b1',
          transactionId: 'TX-1001',
          gigId: 'own1',
          gigTitle: ownGigs[0].title,
          price: 6500,
          clientId: 'c-1',
          clientName: 'Palesa Nkosi',
          freelancerId: user.id,
          freelancerName: user.name,
          date: '2026-10-12',
          note: 'We need the site live before our December launch.',
          status: 'Accepted',
        },
        {
          id: 'b2',
          transactionId: 'TX-1002',
          gigId: 'own2',
          gigTitle: ownGigs[1].title,
          price: 1800,
          clientId: 'c-2',
          clientName: 'Johan Venter',
          freelancerId: user.id,
          freelancerName: user.name,
          date: '2026-09-28',
          note: '',
          status: 'Completed',
        },
        {
          id: 'b3',
          transactionId: 'TX-1003',
          gigId: 'own1',
          gigTitle: ownGigs[0].title,
          price: 6500,
          clientId: 'c-3',
          clientName: 'Nomsa Zulu',
          freelancerId: user.id,
          freelancerName: user.name,
          date: '2026-09-15',
          note: 'Bakery website, photos to follow.',
          status: 'Completed',
          review: { rating: 5, text: 'Brilliant work, thank you!', when: '1 week ago' },
        },
        {
          id: 'b4',
          transactionId: 'TX-1004',
          gigId: 'own2',
          gigTitle: ownGigs[1].title,
          price: 1800,
          clientId: 'c-4',
          clientName: 'Lindiwe Mahlangu',
          freelancerId: user.id,
          freelancerName: user.name,
          date: '2026-10-20',
          note: 'Need this fixed before month end.',
          status: 'Pending',
        },
      ]
    : [
        {
          id: 'b1',
          transactionId: 'TX-1001',
          gigId: 'g1',
          gigTitle: otherGigs[0].title,
          price: 1800,
          clientId: user.id,
          clientName: user.name,
          freelancerId: 'f-thandi',
          freelancerName: 'Thandi Mokoena',
          date: '2026-10-09',
          note: 'Logo for a new coffee shop.',
          status: 'Pending',
        },
        {
          id: 'b2',
          transactionId: 'TX-1002',
          gigId: 'g3',
          gigTitle: otherGigs[2].title,
          price: 1200,
          clientId: user.id,
          clientName: user.name,
          freelancerId: 'f-anele',
          freelancerName: 'Anele Pretorius',
          date: '2026-09-20',
          note: '',
          status: 'Completed',
        },
        {
          id: 'b3',
          transactionId: 'TX-1003',
          gigId: 'g6',
          gigTitle: otherGigs[5].title,
          price: 2200,
          clientId: user.id,
          clientName: user.name,
          freelancerId: 'f-zanele',
          freelancerName: 'Zanele Botha',
          date: '2026-10-15',
          note: '',
          status: 'Accepted',
        },
      ]

  return { gigs, bookings }
}
