import { useLocalStorage } from '@vueuse/core'

/*
 * "Two singers" — splits the mic into a low and a high band so a man and a
 * woman singing together each get their own line. Off by default. One key
 * across every page that offers it, so a pair who turn it on once keep it —
 * the same deal "See your voice" gets. useDuetPitchDetection writes false back
 * here when mic permission is denied.
 */
const isDuetEnabled = useLocalStorage('syng.duetEnabled', false)

export function useDuetMode() {
  return { isDuetEnabled }
}
