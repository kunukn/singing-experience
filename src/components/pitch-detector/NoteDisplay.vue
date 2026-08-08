<script setup lang="ts">
import { toAccidentalGlyph, type NoteInfo } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'

type Props = {
  noteInfo: NoteInfo | null
  isClean: boolean
  /* Duet mode shows two of these side by side, so the glyph steps down a size
   * and the reserved width narrows to keep both on a phone screen. */
  isCompact?: boolean
}

const props = withDefaults(defineProps<Props>(), { isCompact: false })

const { t } = useI18n()
const { isDark } = useDarkMode()

const noteColor = computed(() =>
  props.noteInfo && props.isClean
    ? cleanTextColor(props.noteInfo.cents, isDark.value)
    : null,
)

/*
 * Height reserved for the note glyph, so swapping between it and the much
 * shorter "Listening..." fallback doesn't jog this column — and, since the
 * readout row is items-center, every column beside it.
 *
 * Measured from the tallest note (G♯4: the accidental raises the cap height,
 * the octave digit hangs off the top) at each size step: 48/60 px compact,
 * 72/96 px full.
 */
const noteSlotHeight = computed(() =>
  props.isCompact ? 'h-12 md:h-15' : 'h-18 md:h-24',
)
</script>

<template>
  <div
    class="flex flex-col items-start justify-center"
    :class="isCompact ? 'min-w-24' : 'min-w-38'"
  >
    <div class="flex items-center" :class="noteSlotHeight">
      <div
        v-if="noteInfo && isClean"
        class="transition-colors duration-150"
        :style="{ color: noteColor ?? undefined }"
      >
        <span
          class="font-bold tracking-tight"
          :class="isCompact ? 'text-5xl md:text-6xl' : 'text-7xl md:text-8xl'"
        >
          {{ toAccidentalGlyph(noteInfo.note) }}
        </span>
        <span
          class="mt-2 inline-block align-top font-light"
          :class="isCompact ? 'text-2xl' : 'text-4xl'"
        >
          {{ noteInfo.octave }}
        </span>
      </div>
      <p v-else class="text-sm text-(--p-text-muted-color)">
        {{ t('pitchDetector.listening') }}
      </p>
    </div>

    <!-- The row keeps its height whether or not a note is being sung, so the
         column doesn't grow the moment the singer lands one. -->
    <div
      class="mt-1 flex h-4 items-center gap-1 text-xs tabular-nums"
      :style="{ color: noteColor ?? undefined }"
    >
      <template v-if="noteInfo && isClean">
        <span>{{ t('pitchDetector.cents') }}</span>
        <span class="min-w-6 text-end tabular-nums">
          {{ noteInfo.cents > 0 ? '+' : '' }}{{ noteInfo.cents }}
        </span>
      </template>
    </div>
  </div>
</template>
