import type { Ref } from 'vue'
import { midiToNoteLabel } from '@/utils/noteUtils'

/* How long the rounded sung note must hold steady before its label is shown,
 * so the chip never strobes on attack transients / brief detector wobble.
 * Trimmed-down cousin of SingFly's STABILIZE_START_HOLD_MS (100ms); 50ms reads
 * as steady while staying responsive. */
const DEFAULT_HOLD_MS = 50

type UseStableSungLabelOptions = {
  /* Continuous MIDI of the singer's live pitch (raw, not rounded); null on
   * silence. Reuse the display's existing `sungMidi` — it already null-gates
   * idle / audible-preview / running so the label inherits the same gating. */
  sungMidi: Ref<number | null>
  /* When false, the label drops the octave digit ("C" instead of "C4"). Reactive
   * so toggling it instantly reformats the currently-held label. Default true. */
  showOctave?: Ref<boolean>
  holdMs?: number
}

/**
 * Anti-flicker gate for the singer's note label on the Grace Kelly sheet.
 * A simplified `useStablePitch` (no median window, no range gate): rounds the
 * live pitch to the nearest semitone and only promotes it to the displayed
 * label once it has held that semitone continuously for `holdMs`. Rounding
 * before the hold check gives boundary hysteresis for free — a wobble across
 * the F#2/G2 line re-arms the candidate instead of thrashing the label.
 */
export function useStableSungLabel(options: UseStableSungLabelOptions) {
  const holdMs = options.holdMs ?? DEFAULT_HOLD_MS

  /* Live signed cents between the raw pitch and the promoted label's semitone.
   * Not hold-gated: while the label holds through a note change, the cents
   * keep tracking the true deviation. Null whenever the label is null. */
  const stableSungCents = ref<number | null>(null)

  /* Rounded semitone currently being timed, and when its hold started; null
   * when no pitch is in flight. */
  let candidateMidi: number | null = null
  let candidateSince = 0

  /* Semitone backing the currently displayed label — the cents reference and
   * the label source. A ref (not a plain let) so the label is a computed that
   * reformats instantly when `showOctave` flips, without waiting for the next
   * pitch tick. */
  const stableMidi = ref<number | null>(null)

  const stableSungLabel = computed(() =>
    stableMidi.value === null
      ? null
      : midiToNoteLabel(stableMidi.value, {
          showOctave: options.showOctave?.value ?? true,
        }).label,
  )

  watch(
    () => options.sungMidi.value,
    (midi) => {
      if (midi === null) {
        candidateMidi = null
        stableMidi.value = null
        stableSungCents.value = null

        return
      }

      const now = performance.now()
      const rounded = Math.round(midi)

      if (rounded !== candidateMidi) {
        /* New semitone — re-arm the hold but keep the last label showing so a
         * note change doesn't blank the chip mid-phrase. */
        candidateMidi = rounded
        candidateSince = now
      } else if (now - candidateSince >= holdMs) {
        stableMidi.value = rounded
      }

      stableSungCents.value =
        stableMidi.value === null
          ? null
          : Math.round((midi - stableMidi.value) * 100) // 100 cents per semitone
    },
  )

  return { stableSungLabel, stableSungCents }
}
