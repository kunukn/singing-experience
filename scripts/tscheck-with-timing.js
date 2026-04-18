import { spawn } from 'child_process'
import { performance } from 'perf_hooks'

const startTime = performance.now()

const tsc = spawn(
  'npx',
  ['vue-tsc', '--project', 'tsconfig.app.json', '--noEmit'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
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
