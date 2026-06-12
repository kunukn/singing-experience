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
  const stableSungLabel = ref<string | null>(null)

  /* Live signed cents between the raw pitch and the promoted label's semitone.
   * Not hold-gated: while the label holds through a note change, the cents
   * keep tracking the true deviation. Null whenever the label is null. */
  const stableSungCents = ref<number | null>(null)

  /* Rounded semitone currently being timed, and when its hold started; null
   * when no pitch is in flight. */
  let candidateMidi: number | null = null
  let candidateSince = 0

  /* Semitone backing the currently displayed label — the cents reference. */
  let stableMidi: number | null = null

  watch(
    () => options.sungMidi.value,
    (midi) => {
      if (midi === null) {
        candidateMidi = null
        stableMidi = null
        stableSungLabel.value = null
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
        stableMidi = rounded
        stableSungLabel.value = midiToNoteLabel(rounded).label
      }

      stableSungCents.value =
        stableMidi === null ? null : Math.round((midi - stableMidi) * 100) // 100 cents per semitone
    },
  )

  return { stableSungLabel, stableSungCents }
}
