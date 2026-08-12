import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * End-to-end coverage against the production build in a real browser, where
 * Web Audio actually exists. Chromium is launched with autoplay allowed so the
 * AudioContext can start without a gesture heuristic getting in the way.
 */

const tempoButton = (page: Page) => page.getByRole('button', { name: /beats per minute/i })

/**
 * Selects a radio option by its accessible name.
 *
 * Every radio group in the app hides its inputs with `sr-only` inside the
 * label, so the thing a user actually clicks is the label. Clicking the label
 * exercises that same path; clicking the input would need `force`, since the
 * visible label sits over the input's hit point.
 */
const chooseRadio = (scope: Page | Locator, name: string | RegExp) =>
  scope.getByRole('radio', { name }).locator('..').click()

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Start every test from a known state rather than whatever was persisted.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads with the default tempo and a stopped transport', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Metronome' })).toBeVisible()
  await expect(tempoButton(page)).toContainText('120')
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible()
})

test('starts and stops playback', async ({ page }) => {
  await page.getByRole('button', { name: 'Start metronome' }).click()
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible()

  // The beat indicator should advance past the stopped state.
  await expect(page.getByRole('group', { name: /^Beat [1-4] of 4$/ })).toBeVisible({
    timeout: 5000,
  })

  await page.getByRole('button', { name: 'Stop metronome' }).click()
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible()
})

test('advances through the measure while playing', async ({ page }) => {
  await page.getByRole('button', { name: 'Start metronome' }).click()

  // At 120 BPM every beat of a 4/4 bar is reached within about two seconds.
  const seen = new Set<string>()
  const deadline = Date.now() + 6000
  while (seen.size < 3 && Date.now() < deadline) {
    const label = await page.getByRole('group').first().getAttribute('aria-label')
    if (label) seen.add(label)
    await page.waitForTimeout(60)
  }

  expect(seen.size).toBeGreaterThanOrEqual(3)
})

test('controls the tempo with the keyboard', async ({ page }) => {
  await page.locator('body').press('ArrowUp')
  await expect(tempoButton(page)).toContainText('121')

  await page.locator('body').press('ArrowDown')
  await page.locator('body').press('ArrowDown')
  await expect(tempoButton(page)).toContainText('119')

  await page.locator('body').press('Shift+ArrowUp')
  await expect(tempoButton(page)).toContainText('124')

  await page.locator('body').press('r')
  await expect(tempoButton(page)).toContainText('120')
})

test('starts and stops with the Space key', async ({ page }) => {
  await page.locator('body').press(' ')
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible()

  await page.locator('body').press(' ')
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible()
})

test('accepts a typed tempo', async ({ page }) => {
  await tempoButton(page).click()
  const input = page.getByRole('spinbutton', { name: /tempo in beats per minute/i })
  await input.fill('96')
  await input.press('Enter')

  await expect(tempoButton(page)).toContainText('96')
})

test('changes the time signature and the beat indicator follows', async ({ page }) => {
  await chooseRadio(page, /7 beats per measure/i)
  await expect(page.getByRole('group', { name: /of 7$/ })).toBeVisible()
})

test('persists settings across a reload', async ({ page }) => {
  await chooseRadio(page, /5 beats per measure/i)
  await chooseRadio(page, '16th Notes')
  await tempoButton(page).click()
  const input = page.getByRole('spinbutton')
  await input.fill('152')
  await input.press('Enter')

  await page.reload()

  await expect(tempoButton(page)).toContainText('152')
  await expect(page.getByRole('group', { name: /of 5$/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: '16th Notes' })).toBeChecked()
  // The transport must never come back playing after a reload.
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible()
})

test('sets the tempo by tapping', async ({ page }) => {
  const pad = page.getByRole('button', { name: 'Tap to set tempo' })

  // Four taps 400 ms apart is 150 BPM; allow a small margin for event timing.
  for (let i = 0; i < 4; i++) {
    await pad.click()
    if (i < 3) await page.waitForTimeout(400)
  }

  const text = await tempoButton(page).textContent()
  const bpm = Number(text)
  expect(bpm).toBeGreaterThan(120)
  expect(bpm).toBeLessThan(180)
})

test('opens settings and switches theme', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()

  await chooseRadio(dialog, 'Light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('mutes and unmutes', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })

  await dialog.getByRole('button', { name: 'Mute' }).click()
  await expect(dialog.getByRole('button', { name: 'Unmute' })).toBeVisible()
  await expect(dialog.getByText('Muted')).toBeVisible()
})

test('is usable at a narrow mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })

  // The essential controls stay reachable without horizontal scrolling.
  await expect(tempoButton(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tap to set tempo' })).toBeVisible()

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(overflows).toBe(false)
})
