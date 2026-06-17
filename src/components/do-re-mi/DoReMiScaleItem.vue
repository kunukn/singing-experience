<script setup lang="ts">
import { toAccidentalGlyph } from '@/utils/noteUtils'
import type { ScaleStep } from './useDoReMiGame'

type StepStatus = 'completed' | 'current' | 'upcoming'

type Props = {
  step: ScaleStep
  status: StepStatus
  isComplete: boolean
  isStarted: boolean
  isHighlighted: boolean
  isNewlyActive?: boolean
  holdProgress: number
  buttonTitle: string
  previewOffsetPercent?: number | string | null
  previewNoteLabel?: string | null
  previewIsOutOfRange?: boolean
  excluded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  excluded: false,
  previewIsOutOfRange: false,
  isNewlyActive: false,
})
const emit = defineEmits<{ click: [] }>()

const progressWidth = computed(() => {
  if (props.excluded) return '0%'

  if (
    props.status === 'completed' ||
    (props.status === 'current' && props.isComplete)
  ) {
    return '100%'
  }
  if (props.status === 'current') {
    return `${props.holdProgress * 100}%`
  }

  return '0%'
})

const isCompletedOrDone = computed(
  () =>
    !props.excluded &&
    (props.status === 'completed' ||
      (props.status === 'current' && props.isComplete)),
)
</script>

<template>
  <div
    class="relative"
    :data-note="step.solfege"
    :data-status="status"
    :data-included="!excluded"
    :data-highlighted="isHighlighted"
  >
    <div
      class="flex items-center gap-3 rounded-lg px-4 py-1 transition-[border-color,border-opacity] duration-200"
      :class="{
        'border border-transparent': excluded,
        'border border-(--p-green-500) bg-(--p-green-100)/60 dark:border-(--p-green-700) dark:bg-(--p-green-900)/40':
          !excluded && status === 'completed',
        'border border-(--p-green-500) bg-(--p-green-100)/60 shadow-(--p-green-500)/10 shadow-lg dark:bg-(--p-green-900)/40':
          !excluded && status === 'current' && isComplete,
        'border border-(--p-surface-300) bg-(--p-surface-100)/50 dark:border-(--p-surface-700) dark:bg-(--p-surface-900)/50':
          !excluded &&
          (status === 'upcoming' || status === 'current') &&
          !isComplete,
        'ignite-row': isNewlyActive && !excluded,
      }"
    >
      <!-- Solfège label -->
      <button
        class="text-md w-10 cursor-pointer rounded-sm border text-center font-bold transition-[border-color,color] duration-100 hover:border-(--p-text-color) hover:text-(--p-text-color) sm:text-lg"
        :class="{
          'border-transparent text-(--p-surface-500)': excluded,
          'scale-110 border-(--p-primary-color) text-(--p-primary-color)':
            !excluded && isHighlighted,
          'border-(--p-green-600) text-(--p-green-700) dark:border-(--p-green-700) dark:text-(--p-green-400)':
            !excluded && !isHighlighted && status === 'completed',
          'border-(--p-green-500) text-(--p-green-700) dark:text-(--p-green-400)':
            !excluded && !isHighlighted && status === 'current' && isComplete,
          'border-(--p-green-500) text-(--p-text-color)':
            !excluded &&
            !isHighlighted &&
            status === 'current' &&
            !isComplete &&
            isStarted,
          'border-(--p-surface-300) text-(--p-surface-500) dark:border-(--p-surface-700)':
            !excluded &&
            !isHighlighted &&
            (status === 'upcoming' || (status === 'current' && !isStarted)),
          'pop-label': isNewlyActive && !excluded,
        }"
        :title="buttonTitle"
        @click="emit('click')"
      >
        {{ excluded ? '–' : step.solfege }}
      </button>

      <!-- Note name -->
      <span
        class="w-8 text-sm"
        :class="{
          'text-(--p-surface-500)':
            excluded ||
            (!excluded &&
              (status === 'upcoming' || (status === 'current' && !isStarted))),
          'text-(--p-green-700) dark:text-(--p-green-500)':
            !excluded && isCompletedOrDone,
          'text-(--p-surface-700) dark:text-(--p-surface-300)':
            !excluded && status === 'current' && !isComplete && isStarted,
        }"
      >
        {{ toAccidentalGlyph(step.note) }}{{ step.octave }}
      </span>

      <!-- Progress bar -->
      <div
        class="h-2 flex-1 overflow-hidden rounded-full"
        :class="
          excluded
            ? 'bg-transparent'
            : 'bg-(--p-surface-200) dark:bg-(--p-surface-600)'
        "
      >
        <div
          data-testid="progress-bar"
          class="h-full rounded-full transition-all duration-100"
          :class="{
            'bg-transparent': excluded,
            'bg-(--p-surface-200) dark:bg-(--p-surface-600)':
              !excluded && status === 'upcoming',
            'bg-(--p-green-500)': !excluded && isCompletedOrDone,
            'bg-(--p-green-400)':
              !excluded && status === 'current' && !isComplete,
          }"
          :style="{ width: progressWidth }"
        />
      </div>

      <!-- Status icon -->
      <span class="w-6 text-center">
        <span v-if="excluded" data-testid="status-icon" class="text-transparent"
          >○</span
        >
        <span
          v-else-if="isCompletedOrDone"
          data-testid="status-icon"
          class="text-(--p-green-700) dark:text-(--p-green-400)"
          >✓</span
        >
        <span
          v-else-if="status === 'current' && isStarted"
          data-testid="status-icon"
          class="animate-pulse text-(--p-green-400)"
        >
          ●
        </span>
        <span
          v-else
          data-testid="status-icon"
          class="text-(--p-surface-400) dark:text-(--p-surface-600)"
          >○</span
        >
      </span>
    </div>

    <!-- Preview pitch indicator (rendered inside matching step box) -->
    <div
      v-if="previewOffsetPercent != null"
      class="pointer-events-none absolute inset-x-0 z-10"
      :style="{
        top:
          typeof previewOffsetPercent === 'string'
            ? previewOffsetPercent
            : previewOffsetPercent + '%',
      }"
    >
      <div
        class="relative h-0 border-t-3 border-dashed"
        :class="
          previewIsOutOfRange
            ? 'border-(--p-red-400)/25'
            : 'border-(--p-orange-400)/25'
        "
      >
        <div
          class="absolute start-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
        >
          <div
            class="h-2.5 w-2.5 rounded-full"
            :class="
              previewIsOutOfRange
                ? 'bg-(--p-red-400)/70'
                : 'bg-(--p-orange-400)/70'
            "
          />
          <span
            v-if="previewNoteLabel"
            class="font-mono text-xs font-bold tabular-nums"
            :class="
              previewIsOutOfRange
                ? 'text-(--p-red-400)/80'
                : 'text-(--p-orange-400)/80'
            "
            >{{ previewNoteLabel }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
/*
 * Entrance pop on the solfège label when a step becomes the new current target.
 * Quick scale burst draws the singer's eye to the label they need to sing next.
 */
@keyframes pop-label-anim {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.45);
  }
  70% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}

.pop-label {
  animation: pop-label-anim 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/*
 * Row border glow bloom — the border brightens and a shadow blooms outward
 * when the row becomes the active target, then fades to the normal current-step style.
 */
@keyframes ignite-row-anim {
  0% {
    border-color: var(--p-green-300);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--p-green-400) 40%, transparent);
  }
  60% {
    border-color: var(--p-green-400);
    box-shadow: 0 0 0 6px
      color-mix(in srgb, var(--p-green-400) 20%, transparent);
  }
  100% {
    border-color: inherit;
    box-shadow: none;
  }
}

.ignite-row {
  animation: ignite-row-anim 450ms ease-out both;
}
</style>
