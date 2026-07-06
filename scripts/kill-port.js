import { execSync } from 'child_process'

const isWin = process.platform === 'win32'

const PORT = Number(process.argv[2]) || 5555

function findPidOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(
        `netstat -ano -p TCP | findstr ":${port} "`,
        { encoding: 'utf8' },
      )
      const match = out.match(/LISTENING\s+(\d+)/)
      return match ? Number(match[1]) : null
    }

    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
    const pid = Number(out.trim().split('\n')[0])
    return Number.isFinite(pid) ? pid : null
  } catch {
    return null
  }
}

const pid = findPidOnPort(PORT)

if (!pid) {
  console.log(`Port ${PORT} is free.`)
  process.exit(0)
}

console.log(`Port ${PORT} is in use by PID ${pid}. Killing...`)

try {
  if (isWin) {
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' })
  } else {
    execSync(`kill -9 ${pid}`, { stdio: 'inherit' })
  }
  console.log(`✅ Killed PID ${pid} on port ${PORT}.`)
} catch (error) {
  console.error(`❌ Failed to kill PID ${pid}:`, error.message)
  process.exit(1)
}
