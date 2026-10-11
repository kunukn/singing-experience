import { useLocalStorage } from '@vueuse/core'
import { A4_FREQUENCY } from '@/utils/noteUtils'

/* Tuner reference pitch (A4 in Hz). Some recordings sit off concert pitch —
 * tape vari-speed puts Radiohead's "Street Spirit" near 432 — so the guitar
 * and ukulele tuners let you tune to the record instead of to 440. */

/* ±1 semitone around 440: 415 is baroque pitch, 466 is A♯ at 440 */
export const MIN_REFERENCE_PITCH = 415
export const MAX_REFERENCE_PITCH = 466
/* Slider resolution; matching a recording lands on tenths of a Hz */
export const REFERENCE_PITCH_STEP = 0.1
/* −/+ buttons move a whole Hz — the step musicians name (440 → 442) */
export const REFERENCE_PITCH_BUTTON_STEP = 1

/* Common references, highest first per "Vertical Ordering" in AGENTS.md:
 * 444/442 orchestral, 440 concert, 432 the popular "Verdi" tuning. */
export const REFERENCE_PITCH_PRESETS = [444, 442, 440, 432] as const

/* Clamp into the supported range and round to the slider's resolution, so
 * every way of setting the value (stepper, slider, match) stores the same
 * shape. */
export function clampReferencePitch(hz: number): number {
  if (!Number.isFinite(hz)) return A4_FREQUENCY

  const clamped = Math.min(
    MAX_REFERENCE_PITCH,
    Math.max(MIN_REFERENCE_PITCH, hz),
  )

  return Math.round(clamped * 10) / 10
}

/* Cents from 440 to `hz`; 432 → about −32 */
export function centsFromConcertPitch(hz: number): number {
  return Math.round(1200 * Math.log2(hz / A4_FREQUENCY))
}

/* "432" / "433.2" in the reader's locale — a whole Hz shows no decimals */
export function formatReferencePitch(hz: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hz)
}

const referenceA4 = useLocalStorage('syng.tunerReferencePitch', A4_FREQUENCY)

/* Heal an out-of-range or corrupt value persisted by an older/edited build */
if (clampReferencePitch(referenceA4.value) !== referenceA4.value) {
  referenceA4.value = clampReferencePitch(referenceA4.value)
}

export function useReferencePitch() {
  const isDefault = computed(() => referenceA4.value === A4_FREQUENCY)
  const centsFrom440 = computed(() => centsFromConcertPitch(referenceA4.value))

  function setReferencePitch(hz: number) {
    referenceA4.value = clampReferencePitch(hz)
  }

  function reset() {
    referenceA4.value = A4_FREQUENCY
  }

  return { referenceA4, isDefault, centsFrom440, setReferencePitch, reset }
}
