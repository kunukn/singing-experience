import { spawn } from 'child_process'
import { performance } from 'perf_hooks'
import { existsSync } from 'fs'
import { join } from 'path'

const isWin = process.platform === 'win32'

/* Resolve a devDependency CLI to its local node_modules/.bin path.
 * Never use `npx`/`npm exec` here: under the hardened .npmrc
 * (registry pin + min-release-age cooldown) npx does a registry
 * round-trip to validate the spec, which stalls in restricted
 * environments like the pre-push hook and trips the build timeout. */
const binDir = join(process.cwd(), 'node_modules', '.bin')
const localBin = (name) => {
  const path = join(binDir, isWin ? `${name}.cmd` : name)
  return existsSync(path) ? path : name
}

const tasks = [
  {
    name: 'TS check',
    cmd: localBin('vue-tsc'),
    args: ['--project', 'tsconfig.app.json', '--noEmit'],
  },
  {
    name: 'Lint',
    cmd: localBin('oxlint'),
    args: ['src'],
  },
  {
    name: 'Unit tests',
    cmd: localBin('vitest'),
    args: ['run'],
  },
]

const SEPARATOR = '─'.repeat(50)

/* per-task safety net — prevents indefinite hangs in non-TTY environments */
const DEFAULT_TIMEOUT_MS = 60_000
/* Build can legitimately take longer on cold caches / loaded machines.
 * Override with CHECK_BUILD_TIMEOUT_MS=300000 npm run check when probing. */
const BUILD_TIMEOUT_MS = Number(process.env.CHECK_BUILD_TIMEOUT_MS) || 60_000
const KILL_GRACE_MS = 2_000
const HEARTBEAT_MS = 10_000

function runTask(task) {
  const timeoutMs = task.timeoutMs ?? DEFAULT_TIMEOUT_MS
  /* Stream output live for sequential steps (build/validate) so a hang is
   * visible. Parallel checks buffer to keep their output grouped. */
  const stream = task.stream === true

  let child
  let timedOut = false
  let heartbeatTimer = null

  const taskPromise = new Promise((resolve) => {
    const start = performance.now()
    let stdout = ''
    let stderr = ''
    let lastOutputAt = start
    let firstOutputLogged = false

    const elapsed = () => ((performance.now() - start) / 1000).toFixed(1)
    const trace = (message) => {
      if (!stream) return

      process.stderr.write(`[${task.name} +${elapsed()}s] ${message}\n`)
    }

    /* Force line-buffered, non-TTY progress from Vite/Rollup so we can see
     * which build phase is slow. Without CI=1, Vite prints \r-overwriting
     * progress that only flushes on TTY — invisible through a pipe. */
    const childEnv = stream
      ? { ...process.env, CI: '1', FORCE_COLOR: '1' }
      : process.env

    trace(`spawning ${task.cmd} ${task.args.join(' ')}`)

    /* Use fully-piped stdio so no child process can block waiting on stdin.
     * 'inherit' for stdin can stall spawned processes when the parent isn't
     * a real TTY (e.g. CI, Copilot CLI, editor terminals). */
    child = spawn(task.cmd, task.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWin,
      env: childEnv,
    })

    if (stream) {
      heartbeatTimer = setInterval(() => {
        const sinceMs = Math.round(performance.now() - lastOutputAt)
        trace(`still running, last output ${sinceMs}ms ago`)
      }, HEARTBEAT_MS)
      heartbeatTimer.unref()
    }

    const noteOutput = (kind) => {
      lastOutputAt = performance.now()
      if (!firstOutputLogged) {
        firstOutputLogged = true
        trace(`first output (${kind})`)
      }
    }

    child.stdout.on('data', (d) => {
      stdout += d
      if (stream) {
        process.stdout.write(d)
        noteOutput('stdout')
      }
    })
    child.stderr.on('data', (d) => {
      stderr += d
      if (stream) {
        process.stderr.write(d)
        noteOutput('stderr')
      }
    })

    child.on('error', (err) => {
      const duration = ((performance.now() - start) / 1000).toFixed(2)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      resolve({
        name: task.name,
        code: 1,
        stdout: '',
        stderr: err.message,
        duration,
      })
    })

    child.on('close', (code) => {
      const duration = ((performance.now() - start) / 1000).toFixed(2)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      trace(`exited code=${code}`)
      if (timedOut) {
        const seconds = (timeoutMs / 1000).toFixed(0)
        resolve({
          name: task.name,
          code: 1,
          stdout,
          stderr: stderr + `\nTask timed out after ${seconds}s`,
          duration: String(seconds),
        })
        return
      }

      resolve({ name: task.name, code, stdout, stderr, duration })
    })
  })

  const timeoutPromise = new Promise((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      /* Kill the hanging child so it doesn't keep holding files/ports
       * after we abandon the race. SIGTERM first, then SIGKILL after a
       * short grace period — taskPromise will resolve on 'close'. */
      if (child && !child.killed) {
        try {
          child.kill('SIGTERM')
        } catch {
          /* process may have just exited */
        }
        setTimeout(() => {
          if (child && !child.killed) {
            try {
              child.kill('SIGKILL')
            } catch {
              /* already gone */
            }
          }
        }, KILL_GRACE_MS).unref()
      }

      const seconds = (timeoutMs / 1000).toFixed(0)
      resolve({
        name: task.name,
        code: 1,
        stdout: '',
        stderr: `Task timed out after ${seconds}s`,
        duration: String(seconds),
      })
    }, timeoutMs)
    timer.unref()
  })

  return Promise.race([taskPromise, timeoutPromise])
}

const overallStart = performance.now()

console.log(`\n🔍 Running checks in parallel...\n`)

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
  const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(2)
  console.log(`\n❌ Checks failed — fix the issues above and try again.\n`)
  console.log(`⏱  Total time: ${totalDuration}s\n`)
  process.exit(1)
} else {
  console.log(`\n✅ All checks passed.\n`)
}

// Sequential: build + validate (only if parallel checks passed)
console.log(`🏗️  Running build + validate...\n`)

console.log(`${SEPARATOR}`)
console.log(`  Build`)
console.log(SEPARATOR)

const buildResult = await runTask({
  name: 'Build',
  cmd: localBin('vite'),
  args: ['build'],
  timeoutMs: BUILD_TIMEOUT_MS,
  stream: true,
})

const bIcon = buildResult.code === 0 ? '✅' : '❌'
console.log(`\n${SEPARATOR}`)
console.log(`${bIcon}  ${buildResult.name}  (${buildResult.duration}s)`)
console.log(SEPARATOR)

if (buildResult.code !== 0) {
  const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(2)
  console.log(`\n❌ Build failed — fix the issues above and try again.\n`)
  console.log(`⏱  Total time: ${totalDuration}s\n`)
  process.exit(1)
}

console.log(`${SEPARATOR}`)
console.log(`  Validate`)
console.log(SEPARATOR)

const validateResult = await runTask({
  name: 'Validate',
  cmd: 'node',
  args: ['scripts/validate-build.js'],
  stream: true,
})

const vIcon = validateResult.code === 0 ? '✅' : '❌'
console.log(`\n${SEPARATOR}`)
console.log(`${vIcon}  ${validateResult.name}  (${validateResult.duration}s)`)
console.log(SEPARATOR)

const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(2)

if (validateResult.code !== 0) {
  console.log(
    `\n❌ Build validation failed — fix the issues above and try again.\n`,
  )
} else {
  console.log(`\n${SEPARATOR}`)
  console.log(`  Final summary`)
  console.log(SEPARATOR)
  for (const r of [...results, buildResult, validateResult]) {
    const icon = r.code === 0 ? '✅' : '❌'
    console.log(`  ${icon}  ${r.name.padEnd(12)} ${r.duration}s`)
  }
  console.log(SEPARATOR)
  console.log(`  Total: ${totalDuration}s`)
  console.log(`${SEPARATOR}\n`)
  console.log(`✅ All checks passed.\n`)
}

console.log(`⏱  Total time: ${totalDuration}s\n`)

if (validateResult.code !== 0) process.exit(1)
