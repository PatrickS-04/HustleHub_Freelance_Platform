import { randomBytes } from 'node:crypto'
import { expect } from '@playwright/test'

export const TX_REF = /^TX-[0-9A-F]{8}$/

export const API_URL = process.env.E2E_API_URL || 'http://localhost:3443'

const rand = (bytes = 4) => randomBytes(bytes).toString('hex')

export function newUser(role) {
    return {
        role,
        name: role === 'freelancer' ? 'Frieda Freelancer' : 'Frank Client',
        email: `e2e.${role}.${rand()}@example.com`,
        password: `${rand(12)}Aa1`,
    }
}

export function newGig() {
    return {
        title: `E2E logo design ${rand()}`,
        price: 1500,
        deliveryDays: 5,
        description: 'Created by the Playwright E2E test suite to booked by a test client. Please ignore this gig.',
    }
}

const mainNav = (page) => page.getByRole('navigation', { name: 'Main' })
const passwordField = (page) => page.getByLabel('Password', { exact: true })
 
export const goTab = (page, name) =>
  mainNav(page).getByRole('button', { name, exact: true }).click()
 
export async function register(page, user) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Full name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await passwordField(page).fill(user.password)
  if (user.role === 'freelancer') {
    await page.locator('#role').click()
    await page.getByRole('option', { name: 'Freelancer (offering services)' }).click()
  }
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(mainNav(page)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your account' })).toContainText(user.role)
}
 
export async function login(page, user) {
  await page.goto('/')
  await page.getByLabel('Email').fill(user.email)
  await passwordField(page).fill(user.password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(mainNav(page)).toBeVisible()
}
 
export async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
}
 
export async function createGig(page, gig) {
  await goTab(page, 'My gigs')
  await page.getByRole('button', { name: 'Create a gig' }).click()
  await page.getByLabel('Title').fill(gig.title)
  await page.getByLabel('Price (R)').fill(String(gig.price))
  await page.getByLabel('Delivery (days)').fill(String(gig.deliveryDays))
  await page.getByLabel('Description').fill(gig.description)
  await page.getByRole('button', { name: 'Publish gig' }).click()
  await expect(page.getByText('Gig published.')).toBeVisible()
  await expect(page.getByRole('heading', { name: gig.title, level: 3 })).toBeVisible()
}
 
export async function bookGig(page, gig) {
  await goTab(page, 'Browse gigs')
  await page.getByLabel('Search gigs').fill(gig.title)
  const card = page.getByRole('article').filter({ hasText: gig.title })
  await expect(card).toHaveCount(1)
  await card.getByRole('button', { name: 'Book', exact: true }).click()
 
  const form = page.getByRole('dialog', { name: 'Book this gig' })
  await form.locator('#book-date').click()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await form.getByRole('button', { name: 'Confirm booking' }).click()
 
  const confirmation = page.getByRole('dialog', { name: 'Booking requested' })
  const reference = confirmation.getByText(TX_REF)
  await expect(reference).toBeVisible()
  return { confirmation, txRef: (await reference.textContent()).trim() }
}
 
export async function shot(page, testInfo, name) {
  const path = `e2e-results/evidence/${name}.png`
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}