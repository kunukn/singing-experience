import { useLocalStorage } from '@vueuse/core'

/*
 * The voice-type ribbon drawn beside a chart's note axis. Off by default: it
 * is reference material rather than feedback, and an empty gutter is the
 * quieter default for a page whose job is showing the singer their own pitch.
 * One key across every chart, so turning it on once carries over — the same
 * deal the shared voice range gets.
 */
const isVoiceTypeRibbonVisible = useLocalStorage('syng.voiceTypeRibbon', false)

export function useVoiceTypeRibbon() {
  return { isVoiceTypeRibbonVisible }
}
