/**
 * Validates the production build by starting the preview server
 * and checking that each page renders its expected data-testid element.
 *
 * Usage: node scripts/validate-build.js
 * Or via npm: npm run validate:build
 */

import { spawn } from 'child_process'
import { createServer } from 'net'

const PAGES = [
  { path: '/singing-experience/#/do-re-mi', testId: 'do-re-mi-display' },
  { path: '/singing-experience/#/pitch-detector', testId: 'pitch-detector-display' },
  { path: '/singing-experience/#/tone-detector', testId: 'tone-detector-display' },
]

const TIMEOUT_MS = 10_000

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

async function main() {
  let previewProcess

  try {
    const port = await getFreePort()
    const previewUrl = `http://localhost:${port}`

    // Start the preview server
    console.log('Starting preview server...')
    previewProcess = spawn('npx', ['vite', 'preview', '--port', String(port)], {
      stdio: 'pipe',
      detached: false,
    })

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
      await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT_MS })

      const element = await page.$(`[data-testid="${testId}"]`)
      await page.close()

      if (element) {
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
    if (previewProcess) {
      previewProcess.kill()
    }
  }
}

main()
