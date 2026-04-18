<script setup lang="ts">
import type { ScaleStep } from '@/composables/useDoReMiGame'

type Props = {
  targetStep: ScaleStep
  targetFrequency: number
  centsFromTarget: number | null
  isSingingCorrectNote: boolean
}

const { targetStep, targetFrequency, centsFromTarget, isSingingCorrectNote } =
  defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-4">
    <CentsDeviationBar
      :cents="centsFromTarget"
      :threshold="50"
      :maxRange="150"
      :isVisible="true"
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
          class="text-xs tabular-nums"
          :class="[
            centsFromTarget === null ? 'invisible' : '',
            Math.abs(centsFromTarget || 0) <= 50
              ? 'text-green-400'
              : 'text-red-400',
          ]"
        >
          {{
            t('doReMi.centsFromTarget', {
              cents:
                (centsFromTarget || 0 > 0 ? '+' : '') + (centsFromTarget || 0),
            })
          }}
        </div>

        <p class="text-xs text-gray-600">
          {{ t('doReMi.allowedRange', { hz: Math.round(targetFrequency) }) }}
        </p>
      </div>
    </div>
  </div>
</template>
