import { spawn } from 'child_process'
import { performance } from 'perf_hooks'

const isWin = process.platform === 'win32'

const tasks = [
  {
    name: 'TS check',
    cmd: 'npx',
    args: ['vue-tsc', '--project', 'tsconfig.app.json', '--noEmit'],
  },
  {
    name: 'Lint',
    cmd: 'npx',
    args: ['oxlint', 'src'],
  },
  {
    name: 'Unit tests',
    cmd: 'npx',
    args: ['vitest', 'run'],
  },
]

const SEPARATOR = '─'.repeat(50)

function runTask(task) {
  return new Promise((resolve) => {
    const start = performance.now()
    let stdout = ''
    let stderr = ''

    const child = spawn(task.cmd, task.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: isWin,
    })

    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))

    child.on('error', (err) => {
      const duration = ((performance.now() - start) / 1000).toFixed(2)
      resolve({ name: task.name, code: 1, stdout: '', stderr: err.message, duration })
    })

    child.on('close', (code) => {
      const duration = ((performance.now() - start) / 1000).toFixed(2)
      resolve({ name: task.name, code, stdout, stderr, duration })
    })
  })
}

const overallStart = performance.now()

console.log(`\n🔍 Running pre-push checks in parallel...\n`)

const results = await Promise.all(tasks.map(runTask))

const overallDuration = ((performance.now() - overallStart) / 1000).toFixed(2)

// Print buffered output per task
for (const r of results) {
  const icon = r.code === 0 ? '✅' : '❌'
  console.log(`\n${SEPARATOR}`)
  console.log(`${icon}  ${r.name}  (${r.duration}s)`)
  console.log(SEPARATOR)
  if (r.stdout.trim()) process.stdout.write(r.stdout)
  if (r.stderr.trim()) process.stderr.write(r.stderr)
}

// Summary table
console.log(`\n${SEPARATOR}`)
console.log(`  Summary`)
console.log(SEPARATOR)
for (const r of results) {
  const icon = r.code === 0 ? '✅' : '❌'
  console.log(`  ${icon}  ${r.name.padEnd(12)} ${r.duration}s`)
}
console.log(`${SEPARATOR}`)
console.log(`  Total: ${overallDuration}s`)
console.log(SEPARATOR)

const anyFailed = results.some((r) => r.code !== 0)

if (anyFailed) {
  console.log(`\n❌ Git push blocked — fix the issues above and try again.\n`)
  process.exit(1)
} else {
  console.log(`\n✅ All checks passed.\n`)
}

// Sequential: build + validate (only if parallel checks passed)
console.log(`🏗️  Running build + validate...\n`)

const buildResult = await runTask({
  name: 'Build',
  cmd: 'npx',
  args: ['vite', 'build'],
})

const bIcon = buildResult.code === 0 ? '✅' : '❌'
console.log(`\n${SEPARATOR}`)
console.log(`${bIcon}  ${buildResult.name}  (${buildResult.duration}s)`)
console.log(SEPARATOR)
if (buildResult.stdout.trim()) process.stdout.write(buildResult.stdout)
if (buildResult.stderr.trim()) process.stderr.write(buildResult.stderr)

if (buildResult.code !== 0) {
  console.log(`\n❌ Git push blocked — build failed.\n`)
  process.exit(1)
}

const validateResult = await runTask({
  name: 'Validate',
  cmd: 'node',
  args: ['scripts/validate-build.js'],
})

const vIcon = validateResult.code === 0 ? '✅' : '❌'
console.log(`\n${SEPARATOR}`)
console.log(`${vIcon}  ${validateResult.name}  (${validateResult.duration}s)`)
console.log(SEPARATOR)
if (validateResult.stdout.trim()) process.stdout.write(validateResult.stdout)
if (validateResult.stderr.trim()) process.stderr.write(validateResult.stderr)

if (validateResult.code !== 0) {
  console.log(`\n❌ Git push blocked — build validation failed.\n`)
  process.exit(1)
} else {
  console.log(`\n✅ All checks passed — pushing.\n`)
}
