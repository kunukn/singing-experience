import { expect, test } from '@playwright/test'

/*
 * Every language but English is fetched on demand (src/i18n.ts). The page
 * must wait for it instead of painting in English first.
 */
test('a returning singer never sees English before their own language', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('syng.locale', 'da'))

  // Hold the Danish strings back, as a slow connection would.
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  // Dev serves the JSON module itself; a build serves a hashed chunk.
  const danishStrings = /\/da(\.json|-[\w-]+\.js)/
  await page.route(danishStrings, async (route) => {
    await held
    await route.continue()
  })

  const request = page.waitForRequest(danishStrings)
  await page.goto('/')
  await request

  /*
   * The app has started and is waiting: nothing is on the page in any
   * language. Buttons are the telling part, since the header's are there the
   * moment the app mounts, before any page has loaded.
   */
  await expect(page.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('heading')).toHaveCount(0)

  release()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sangoplevelse' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Singing Experience' }),
  ).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('lang', 'da')
})

test('a picked language is still there after a reload', async ({ page }) => {
  await page.goto('/')
  const title = page.getByRole('heading', { level: 1 })
  await expect(title).toHaveText('Singing Experience')

  await page.getByRole('combobox', { name: 'Language' }).click()
  await page.getByRole('option', { name: 'Dansk' }).click()
  await expect(title).toHaveText('Sangoplevelse')

  await page.reload()

  await expect(title).toHaveText('Sangoplevelse')
  await expect(page.locator('html')).toHaveAttribute('lang', 'da')
})

test('Arabic mirrors the page and English turns it back', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const language = page.getByRole('combobox', { name: 'Language' })
  await expect(html).toHaveAttribute('dir', 'ltr')

  await language.click()
  await page.getByRole('option', { name: 'العربية' }).click()
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'ar')

  /*
   * Found by position, not by name: its label is Arabic now. A page that
   * stayed mirrored after switching back would be a bug of its own.
   */
  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'English' }).click()
  await expect(html).toHaveAttribute('dir', 'ltr')
})
