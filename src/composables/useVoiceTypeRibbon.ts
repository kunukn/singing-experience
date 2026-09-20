import { useLocalStorage } from '@vueuse/core'

/*
 * The voice-type ribbon drawn beside a chart's note axis. On by default: it
 * answers "which voice am I singing in?" without the singer having to find a
 * toggle first, and the bars stay dimmed so the pitch trace remains the
 * loudest thing on the chart. One key across every chart, so turning it off
 * once carries over — the same deal the shared voice range gets.
 */
const isVoiceTypeRibbonVisible = useLocalStorage('syng.voiceTypeRibbon', true)

export function useVoiceTypeRibbon() {
  return { isVoiceTypeRibbonVisible }
}
