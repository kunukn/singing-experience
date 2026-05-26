import { spawn } from 'child_process'
import { performance } from 'perf_hooks'
import { existsSync } from 'fs'
import { join } from 'path'

const isWin = process.platform === 'win32'

/* Use the local node_modules/.bin entry, not npx — npx does a
 * registry round-trip under the hardened .npmrc and can stall. */
const localBin = (name) => {
  const path = join(process.cwd(), 'node_modules', '.bin', isWin ? `${name}.cmd` : name)
  return existsSync(path) ? path : name
}

const startTime = performance.now()

const tsc = spawn(
  localBin('vue-tsc'),
  ['--project', 'tsconfig.app.json', '--noEmit'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWin,
  },
)

let stdout = ''
let stderr = ''

tsc.stdout.on('data', (data) => {
  stdout += data
})

tsc.stderr.on('data', (data) => {
  stderr += data
})

tsc.on('close', (code) => {
  const endTime = performance.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Count errors from tsc output
  const errorLines = stdout
    .split('\n')
    .filter((line) => line.includes('error TS'))
  const errorCount = errorLines.length

  // Print the original output
  if (stdout) console.log(stdout)
  if (stderr) console.error(stderr)

  console.log(`${'─'.repeat(50)}`)
  console.log(`Type errors:  ${errorCount}`)
  console.log(`Duration:     ${duration}s`)

  process.exit(code)
})
