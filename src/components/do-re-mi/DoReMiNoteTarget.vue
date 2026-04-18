<script setup lang="ts">
import type { ScaleStep } from '@/composables/useDoReMiGame'

type Props = {
  targetStep: ScaleStep
  targetFrequency: number
  currentFrequency: number | null
  centsFromTarget: number | null
  isSingingCorrectNote: boolean
}

const {
  targetStep,
  targetFrequency,
  currentFrequency,
  centsFromTarget,
  isSingingCorrectNote,
} = defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-4">
    <CentsDeviationBar
      :cents="centsFromTarget"
      :threshold="50"
      :maxRange="150"
      :isVisible="true"
      :highLabel="t('doReMi.tooHigh')"
      :lowLabel="t('doReMi.tooLow')"
      colorMode="directional"
    />

    <div>
      <div class="flex-flow flex items-center gap-2">
        <p class="text-sm text-gray-400">{{ t('doReMi.singThisNote') }}</p>
        <div
          class="text-5xl font-bold"
          :class="isSingingCorrectNote ? 'text-green-400' : 'text-white'"
        >
          {{ targetStep.solfege }}
        </div>
      </div>

      <div class="flex min-h-8 flex-col justify-end gap-1">
        <div
          class="flex items-center gap-1 text-xs"
          :class="[
            centsFromTarget === null ? 'invisible' : '',
            Math.abs(centsFromTarget ?? 0) <= 50
              ? 'text-green-400'
              : (centsFromTarget ?? 0) > 0
                ? 'text-orange-400'
                : 'text-blue-400',
          ]"
        >
          <span>{{ t('doReMi.cents') }} </span>
          <span class="tabular-nums">
            {{
              ((centsFromTarget ?? 0) > 0 ? '+' : '') + (centsFromTarget ?? 0)
            }}
          </span>
        </div>

        <p class="text-xs text-gray-600">
          {{ t('doReMi.allowedRange', { hz: Math.round(targetFrequency) }) }}
        </p>
        <p
          class="text-xs tabular-nums"
          :class="currentFrequency === null ? 'invisible' : 'text-gray-400'"
        >
          {{ t('doReMi.currentHz', { hz: Math.round(currentFrequency ?? 0) }) }}
        </p>
      </div>
    </div>
  </div>
</template>
