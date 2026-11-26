import { expect, test, type Page } from '@playwright/test'

type CatalogueCard = { title: string; path: string }

/* Every program card on a catalogue page: its heading and where it leads. */
async function readCatalogue(
  page: Page,
  path: string,
): Promise<CatalogueCard[]> {
  await page.goto(path)
  const cards = page.getByRole('region').getByRole('link')
  await expect(cards.first()).toBeVisible()

  const catalogue: CatalogueCard[] = []
  for (const card of await cards.all()) {
    catalogue.push({
      title: await card.getByRole('heading').innerText(),
      path: (await card.getAttribute('href')) ?? '',
    })
  }

  return catalogue
}

test('the landing page leads into a game and back out', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: /^Singing Games/ }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Singing Games' }),
  ).toBeVisible()

  await page.getByRole('link', { name: /^DO RE MI/ }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/do-re-mi')
  await expect(
    page.getByRole('heading', { level: 1, name: 'DO RE MI' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/games')
})

/*
 * The Program Header rule (docs/product/design-rules.md): a program page opens
 * with its card's name as the title. Read from the catalogue, so a new program
 * is covered the day its card is added.
 */
for (const cataloguePath of ['/games', '/tools']) {
  test(`every card on ${cataloguePath} opens a page titled like the card`, async ({
    page,
  }) => {
    const catalogue = await readCatalogue(page, cataloguePath)
    expect(catalogue.length).toBeGreaterThan(0)

    for (const { title, path } of catalogue) {
      await page.goto(path)
      await expect(
        page.getByRole('heading', { level: 1 }),
        `${path} should be titled like its card`,
      ).toHaveText(title)
    }
  })
}

test('an unknown address says the page is not there', async ({ page }) => {
  await page.goto('/no-such-program')

  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
})
