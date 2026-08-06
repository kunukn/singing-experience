<script setup lang="ts">
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import type { DuetLane } from '@/components/piano/useDuetPitchDetection'
import type { ScaleHighlightMode } from '@/utils/scaleHighlight'
import type { GuitarPreviewLaneId } from './guitarPreview'

/*
 * Placeholder for the fretboard. The prop surface is the finished one, so the
 * layout, playback and live-pitch overlay can land here without touching
 * GuitarPage — nothing below reads them yet.
 */
type Props = {
  midiMin: number
  midiMax: number
  /* Live mic preview lanes (from GuitarPage). One entry in single-voice mode,
   * two in duet mode. A lane with a null previewMidi draws nothing, so the
   * array length is stable while a singer is silent. */
  previewLanes?: Array<DuetLane & { laneId: GuitarPreviewLaneId }>
  /* When true, the fretboard will mark each note's dead centre. */
  isPreviewEnabled?: boolean
  /* Note-name labels on the frets: 'off', 'simple' (bare names, e.g. C♯), or
   * 'advanced' (names with octave, e.g. C♯2). */
  toneLabelMode?: ToneLabelMode
  /* Root pitch class (0–11) of the scale to tint, or null for no highlighting. */
  scaleRoot?: number | null
  scaleMode?: ScaleHighlightMode
}
defineProps<Props>()

/* Will fire on every plucked string, so the parent can arm the preview deaf
 * period (stops the guitar's own tone registering as sung pitch). */
defineEmits<{ tonePlayed: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex min-h-40 w-full items-center justify-center rounded-md border border-dashed border-(--p-content-border-color) text-sm text-(--p-text-muted-color)"
    data-testid="guitar-display"
  >
    {{ t('guitar.fretboardComingSoon') }}
  </div>
</template>
