/**
 * Validates the production build by starting the preview server
 * and checking that each page renders its expected data-testid element.
 *
 * Usage: node scripts/validate-build.js
 * Or via npm: npm run build:validate
 */

import { spawn } from 'child_process'
import { createServer } from 'net'
import { existsSync } from 'fs'
import { join } from 'path'

const isWin = process.platform === 'win32'

/* Use the local node_modules/.bin entry, not npx — npx does a
 * registry round-trip under the hardened .npmrc and can stall. */
const localBin = (name) => {
  const path = join(process.cwd(), 'node_modules', '.bin', isWin ? `${name}.cmd` : name)
  return existsSync(path) ? path : name
}

const PAGES = [
  { path: '/do-re-mi', testId: 'do-re-mi-display' },
  {
    path: '/pitch-detector',
    testId: 'pitch-detector-display',
  },
  {
    path: '/tone-detector',
    testId: 'tone-detector-display',
  },
]

/*
 * Theme colours the <canvas> charts read at draw time (see src/utils/cssColor.ts).
 * These have to survive the round trip CSS variable -> resolved string -> canvas
 * colour, and every step of that is untyped and fails silently.
 *
 * This exists because of a real regression: @primeuix/themes v3 rewrote these
 * tokens using the CSS light-dark() function, which getComputedStyle returns
 * verbatim rather than resolving. The unparseable result was then assigned to
 * ctx.fillStyle, which is a NO-OP on bad input — so the charts kept drawing in
 * whatever colour was left over, and note labels became invisible. No error, no
 * warning, no failing test.
 *
 * A dependency bump is exactly when this breaks, so assert it here where a
 * headless browser and the real theme are already running.
 */
const CANVAS_THEME_VARS = [
  '--p-text-color',
  '--p-content-background',
  '--p-content-border-color',
  '--p-primary-color',
  '--p-surface-400',
  '--p-red-500',
]

/* PrimeVue's darkModeSelector (see src/main.ts); toggling it on <html> is what
 * flips light-dark(), so both branches need checking. */
const DARK_CLASS = 'p-dark'

const TIMEOUT_MS = 60_000
const SELECTOR_TIMEOUT_MS = 15_000

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`)
}

/*
 * Asserts every CANVAS_THEME_VARS entry survives the trip to a canvas colour, in
 * both light and dark mode. Returns the failures; empty means all good.
 *
 * The resolution technique mirrors src/utils/cssColor.ts: a custom property's
 * computed value is its *specified* value, so light-dark() and friends are never
 * evaluated there. Assigning `color: var(--token)` to a real element in the
 * document does resolve it, because it branches on the inherited color-scheme.
 */
async function validateCanvasThemeColors(browser, previewUrl) {
  const page = await browser.newPage()
  try {
    await page.goto(`${previewUrl}${PAGES[0].path}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT_MS,
    })
    /* The theme's stylesheet has to be applied before any of this means
     * anything; the app's own root testid is the readiest signal. */
    await page.waitForSelector(`[data-testid="${PAGES[0].testId}"]`, {
      state: 'attached',
      timeout: SELECTOR_TIMEOUT_MS,
    })

    console.log('Checking canvas theme colors...')

    return await page.evaluate(
      ({ names, darkClass }) => {
        const probe = document.createElement('span')
        probe.style.display = 'none'
        document.body.appendChild(probe)
        const context = document.createElement('canvas').getContext('2d')

        /* Two sentinels, so a token that legitimately IS one of them is not
         * misreported: a rejected assignment leaves fillStyle on the preceding
         * sentinel, so only failing against both means unparseable. */
        const sentinels = ['#ff00ff', '#00ff00']
        const failures = []
        const root = document.documentElement
        const wasDark = root.classList.contains(darkClass)

        for (const mode of ['light', 'dark']) {
          root.classList.toggle(darkClass, mode === 'dark')

          for (const name of names) {
            probe.style.color = ''
            probe.style.color = `var(${name})`
            const resolved = getComputedStyle(probe).color.trim()

            const isRejected = sentinels.every((sentinel) => {
              context.fillStyle = sentinel
              context.fillStyle = resolved

              return context.fillStyle === sentinel
            })
            if (isRejected || !resolved) failures.push({ name, mode, resolved })
          }
        }

        root.classList.toggle(darkClass, wasDark)
        probe.remove()

        return failures
      },
      { names: CANVAS_THEME_VARS, darkClass: DARK_CLASS },
    )
  } finally {
    await page.close()
  }
}

let previewProcess

/* Kill the preview server and any children it spawned.
 * On POSIX the server runs as its own process-group leader (detached),
 * so we signal the whole group with a negative PID to avoid orphaning
 * grandchildren when this script is itself killed by a signal. */
function killPreview() {
  if (!previewProcess || previewProcess.killed) return

  const { pid } = previewProcess
  try {
    if (isWin) {
      previewProcess.kill()
    } else {
      process.kill(-pid, 'SIGTERM')
      /* Escalate if it ignores SIGTERM. unref so this timer never keeps
       * the event loop alive on a clean exit. */
      setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL')
        } catch {
          /* already gone */
        }
      }, 2_000).unref()
    }
  } catch {
    /* process group already gone */
  }
}

/* Signal/exit handlers guarantee cleanup even when the `finally` below
 * never runs — e.g. when check.js's watchdog SIGTERM/SIGKILLs this
 * process. Without these, the preview server reparents to PID 1 and leaks. */
process.on('exit', killPreview)
process.on('SIGINT', () => {
  killPreview()
  process.exit(130)
})
process.on('SIGTERM', () => {
  killPreview()
  process.exit(143)
})

async function main() {
  try {
    const port = await getFreePort()
    const previewUrl = `http://localhost:${port}`

    // Start the preview server
    console.log('Starting preview server...')
    previewProcess = spawn(
      localBin('vite'),
      ['preview', '--port', String(port)],
      {
        stdio: 'pipe',
        /* Own process group on POSIX so killPreview can take down the
         * whole tree; shell:true on Windows where detached groups differ. */
        detached: !isWin,
        shell: isWin,
      },
    )

    previewProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      if (msg.trim()) console.error('[preview]', msg.trim())
    })

    // Wait for the server to be ready
    await waitForServer(previewUrl, TIMEOUT_MS)
    console.log('Preview server is ready.')

    // Use Playwright to validate each page
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--ignore-certificate-errors'],
    })

    const failures = []

    for (const { path, testId } of PAGES) {
      const page = await browser.newPage()
      const url = `${previewUrl}${path}`
      console.log(`Navigating to ${url}...`)
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT_MS,
      })

      let found = false
      try {
        await page.waitForSelector(`[data-testid="${testId}"]`, {
          state: 'attached',
          timeout: SELECTOR_TIMEOUT_MS,
        })
        found = true
      } catch {
        /* selector did not appear within the timeout */
      }
      await page.close()

      if (found) {
        console.log(`✅ Found data-testid="${testId}" on ${url}`)
      } else {
        console.error(`❌ data-testid="${testId}" not found on ${url}`)
        failures.push({ url, testId })
      }
    }

    const themeFailures = await validateCanvasThemeColors(browser, previewUrl)

    await browser.close()

    if (themeFailures.length > 0) {
      console.error(
        `\n❌ FAILURE: ${themeFailures.length} theme colour(s) cannot be used on a canvas.`,
      )
      for (const { name, mode, resolved } of themeFailures) {
        console.error(`   ${name} (${mode} mode) resolved to: ${resolved}`)
      }
      console.error(
        `\nAnything drawn with these keeps the canvas's previous colour instead — ` +
          `silently. A UI library upgrade most likely changed the token format. ` +
          `See src/utils/cssColor.ts.`,
      )
      process.exit(1)
    }

    if (failures.length === 0) {
      console.log(`\n✅ SUCCESS: All ${PAGES.length} pages validated.`)
      process.exit(0)
    } else {
      console.error(
        `\n❌ FAILURE: ${failures.length}/${PAGES.length} page(s) failed validation.`,
      )
      console.error(
        `Ensure that Vue can compile and run. Test by running: npm run build && npm run preview, then check the failing pages in a browser.`,
      )
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ FAILURE:', err.message)
    process.exit(1)
  } finally {
    killPreview()
  }
}

main()
