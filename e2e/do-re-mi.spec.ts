import { expect, test, type Page } from '@playwright/test'

/*
 * Sung flows run on the -test route: its simulated singer stands in for the
 * microphone, so no permission prompt and no real audio (see "Test Pages" in
 * AGENTS.md).
 */
const SIMULATED_GAME = '/do-re-mi-test'

function scaleStep(page: Page, index: number) {
  return page.getByTestId(`scale-step-${index}`)
}

/* The simulated singer moves to the note the game is asking for. */
async function singTarget(page: Page) {
  await page.getByRole('button', { name: 'Match target' }).click()
}

/* "Hold each note for 0.75 seconds to continue" → 0.75 */
async function readHoldSeconds(page: Page): Promise<number> {
  const subtitle = await page.getByTestId('program-subtitle').innerText()

  return Number(/\d+(\.\d+)?/.exec(subtitle)?.[0])
}

/*
 * The game clock, "⏱ 3s" → 3. No ^ or $ in the pattern: getByText hands a
 * regex the element's text with the template's surrounding spaces still on it.
 */
async function readClockSeconds(page: Page): Promise<number> {
  const clock = await page.getByText(/⏱ \d+s/).innerText()

  return Number(/\d+/.exec(clock)?.[0])
}

test('a held note moves the scale on, a wrong note does not', async ({
  page,
}) => {
  await page.goto(SIMULATED_GAME)
  const holdSeconds = await readHoldSeconds(page)
  expect(holdSeconds).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Start' }).click()
  await singTarget(page)

  await expect(scaleStep(page, 0)).toHaveAttribute('data-status', 'completed')
  await expect(scaleStep(page, 1)).toHaveAttribute('data-status', 'current')

  /*
   * The singer is still on the first note while the game asks for the second.
   * Let the game clock run past a full hold, plus a second for its rounding:
   * a note that counted would have moved the scale on by now.
   */
  const secondsAtSecondNote = await readClockSeconds(page)
  await expect
    .poll(() => readClockSeconds(page))
    .toBeGreaterThanOrEqual(secondsAtSecondNote + Math.ceil(holdSeconds) + 1)

  await expect(scaleStep(page, 1)).toHaveAttribute('data-status', 'current')
  await expect(scaleStep(page, 2)).toHaveAttribute('data-status', 'upcoming')
})

test('singing the whole scale ends the game and saves a best score', async ({
  page,
}) => {
  await page.goto(SIMULATED_GAME)
  // Start is clicked first: count() reads the page as it is, without waiting.
  await page.getByRole('button', { name: 'Start' }).click()
  const stepCount = await page.getByTestId(/^scale-step-\d+$/).count()
  expect(stepCount).toBeGreaterThan(1)

  for (let index = 0; index < stepCount - 1; index++) {
    await singTarget(page)
    await expect(scaleStep(page, index + 1)).toHaveAttribute(
      'data-status',
      'current',
    )
  }
  // The last note has no next step to wait for: it ends the game.
  await singTarget(page)

  await expect(
    page.getByRole('heading', { name: 'Congratulations!' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible()

  /* "Best scores 8.1s": the time this run just set, read instead of assumed. */
  const bestScoreLink = page.getByRole('link', { name: /^Best scores/ })
  const [finishTime] = /[\d.]+s/.exec(await bestScoreLink.innerText()) ?? []
  expect(finishTime).toBeTruthy()

  await bestScoreLink.click()

  await expect(page).toHaveURL((url) => url.pathname === '/records')
  const scores = page.getByRole('region', { name: 'DO RE MI' })
  await expect(scores.getByRole('listitem')).toHaveCount(1)
  await expect(scores.getByRole('listitem')).toContainText(finishTime ?? '')
})
