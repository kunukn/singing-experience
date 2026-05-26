<script setup lang="ts">
import type { MidiNoteLabel } from '@/utils/noteUtils'

type Props = {
  targetNoteLabel: MidiNoteLabel
  isSingingCorrectNote: boolean
  showSingHigherArrow: boolean
  showSingLowerArrow: boolean
  centsFromTarget: number | null
  targetFrequency: number | null
  currentFrequency: number | null
  holdProgress: number
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="pointer-events-none flex flex-col items-center gap-1">
    <div
      class="text-3xl font-bold"
      :class="
        isSingingCorrectNote ? 'text-(--p-green-400)' : 'text-(--p-text-color)'
      "
    >
      {{ targetNoteLabel.label }}
    </div>

    <div class="flex items-center gap-2">
      <div class="grid w-6 place-items-center">
        <div
          class="col-start-1 row-start-1"
          :class="
            showSingLowerArrow
              ? 'animate-bounce text-(--p-blue-400)'
              : 'invisible'
          "
        >
          <ArrowUpIcon class="size-5 rotate-180" />
        </div>
        <div
          class="col-start-1 row-start-1"
          :class="
            showSingHigherArrow
              ? 'animate-bounce text-(--p-orange-400)'
              : 'invisible'
          "
        >
          <ArrowUpIcon class="size-5" />
        </div>
      </div>

      <CentsDeviationBar
        :cents="centsFromTarget"
        :threshold="50"
        :maxRange="150"
        :isVisible="true"
        :highLabel="t('generic.tooHigh')"
        :lowLabel="t('generic.tooLow')"
        colorMode="directional"
        class="pe-8"
      />
    </div>

    <div class="flex min-h-8 flex-col justify-end gap-1">
      <div
        class="flex items-center gap-1 text-xs"
        :class="[
          centsFromTarget === null ? 'invisible' : '',
          Math.abs(centsFromTarget ?? 0) <= 50
            ? 'text-(--p-green-400)'
            : (centsFromTarget ?? 0) > 0
              ? 'text-(--p-orange-400)'
              : 'text-(--p-blue-400)',
        ]"
      >
        <span>{{ t('doReMi.cents') }} </span>
        <span class="tabular-nums">
          {{ ((centsFromTarget ?? 0) > 0 ? '+' : '') + (centsFromTarget ?? 0) }}
        </span>
      </div>

      <p v-if="targetFrequency" class="text-xs text-(--p-surface-500)">
        {{ t('doReMi.allowedRange', { hz: Math.round(targetFrequency) }) }}
      </p>
      <p
        class="text-xs tabular-nums"
        :class="
          currentFrequency === null
            ? 'invisible'
            : 'text-(--p-text-muted-color)'
        "
      >
        {{
          t('doReMi.currentHz', {
            hz: Math.round(currentFrequency ?? 0),
          })
        }}
      </p>
    </div>

    <!-- Hold progress bar -->
    <div
      class="mt-1 h-2 w-full max-w-full overflow-hidden rounded-full bg-(--p-surface-200) dark:bg-(--p-surface-700)"
    >
      <div
        class="h-full rounded-full bg-(--p-green-500) transition-all duration-100"
        :style="{ width: `${holdProgress * 100}%` }"
      />
    </div>
  </div>
</template>
