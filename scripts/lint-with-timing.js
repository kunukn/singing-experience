import { spawn } from 'child_process'
import { performance } from 'perf_hooks'
import { existsSync } from 'fs'
import { join } from 'path'

const isWin = process.platform === 'win32'

/* Use the local node_modules/.bin entry, not npx — npx does a
 * registry round-trip under the hardened .npmrc and can stall. */
const localBin = (name) => {
  const path = join(
    process.cwd(),
    'node_modules',
    '.bin',
    isWin ? `${name}.cmd` : name,
  )
  return existsSync(path) ? path : name
}

const startTime = performance.now()

/* The one place that decides how lint runs: `npm run lint`, the Lint step in
 * scripts/check.js and the pre-commit hook all call this script. lint-staged
 * appends the staged paths; with no paths it lints src and e2e.
 * --deny-warnings has no limit to raise: fix a new warning, or turn its rule
 * off in .oxlintrc.json with a comment saying why. */
const targets = process.argv.slice(2)
const oxlintArgs = [
  '--deny-warnings',
  ...(targets.length ? targets : ['src', 'e2e']),
]

const oxlint = spawn(localBin('oxlint'), oxlintArgs, {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: isWin,
})

oxlint.on('close', (code) => {
  const endTime = performance.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Duration:  ${duration}s`)

  process.exit(code)
})
