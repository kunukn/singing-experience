/* eslint-disable no-unused-vars */
type LogFn = (...args: unknown[]) => void

const noop: LogFn = () => {}

export let debugLog: LogFn = noop

export function initLogger() {
  debugLog = console.debug.bind(console)
}
