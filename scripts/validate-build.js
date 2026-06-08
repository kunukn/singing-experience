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

    await browser.close()

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
