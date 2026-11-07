import { test, expect } from '@playwright/test'
import {
  API_URL,
  TX_REF,
  bookGig,
  createGig,
  goTab,
  login,
  logout,
  newGig,
  newUser,
  register,
  shot,
} from './helpers.js'

test.describe('HustleHub+ booking journey', () => {
  test('a client books a gig and both sides see the same transaction reference', async ({ page }, testInfo) => {
    const freelancer = newUser('freelancer')
    const client = newUser('client')
    const gig = newGig()
    let txRef

    await test.step('freelancer registers and lists a gig', async () => {
      await register(page, freelancer)
      await createGig(page, gig)
      await shot(page, testInfo, '01-freelancer-gig-published')
      await logout(page)
    })

    await test.step('client registers, finds the gig and books it', async () => {
      await register(page, client)
      const booked = await bookGig(page, gig)
      txRef = booked.txRef
      expect(txRef).toMatch(TX_REF)
      await expect(booked.confirmation).toContainText(gig.title)
      await expect(booked.confirmation).toContainText(freelancer.name)
      await expect(booked.confirmation).toContainText('R 1,500')
      await shot(page, testInfo, '02-client-booking-confirmation')
      await booked.confirmation.getByRole('button', { name: 'Done' }).click()
    })

    await test.step('after a reload the client still sees the booking and the same reference', async () => {
      await page.reload()
      await goTab(page, 'My bookings')
      const row = page.getByRole('listitem').filter({ hasText: txRef })
      await expect(row.getByText(txRef, { exact: true })).toBeVisible()
      await expect(row).toContainText(gig.title)
      await expect(row.getByText('Pending', { exact: true })).toBeVisible()
      await expect(row).toContainText('R 1,500')
      await shot(page, testInfo, '03-client-bookings-list')
      await logout(page)
    })

    await test.step('freelancer logs in, sees the request and accepts it', async () => {
      await login(page, freelancer)
      await goTab(page, 'Bookings')
      const row = page.getByRole('listitem').filter({ hasText: txRef })
      await expect(row.getByText(txRef, { exact: true })).toBeVisible()
      await expect(row).toContainText(client.name)
      await row.getByRole('button', { name: 'Accept', exact: true }).click()
      await expect(page.getByText(`${txRef} accepted.`)).toBeVisible()
      await expect(row.getByText('Accepted', { exact: true })).toBeVisible()
    })

    await test.step('the receipt shows the same transaction reference', async () => {
      await page
        .getByRole('listitem')
        .filter({ hasText: txRef })
        .getByRole('button', { name: 'Receipt' })
        .click()
      const receipt = page.getByRole('dialog', { name: 'Receipt' })
      await expect(receipt.getByText(txRef, { exact: true })).toBeVisible()
      await expect(receipt).toContainText(client.name)
      await expect(receipt).toContainText('R 1,500')
      await shot(page, testInfo, '04-freelancer-receipt')
    })
  })

  test('a wrong password gets a generic error and stays on the login screen', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(newUser('client').email) // never registered
    await page.getByLabel('Password', { exact: true }).fill('Not-The-Password-1')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  })

  test('logging out ends the session, even after a reload', async ({ page }) => {
    await register(page, newUser('client'))
    await logout(page)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

    const me = await page.request.get(`${API_URL}/api/auth/me`)
    expect(me.status()).toBe(401)
  })
})