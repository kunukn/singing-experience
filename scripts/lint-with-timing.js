import { spawn } from 'child_process'
import { performance } from 'perf_hooks'

const startTime = performance.now()

const oxlint = spawn('npx', ['oxlint', 'src'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: process.platform === 'win32',
})

oxlint.on('close', (code) => {
  const endTime = performance.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Duration:  ${duration}s`)

  process.exit(code)
})
