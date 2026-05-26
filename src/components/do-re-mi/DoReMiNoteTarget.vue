<script setup lang="ts">
import type { ScaleStep } from './useDoReMiGame'
import { TOO_LOW_OR_HIGH_HINT_MS } from './useDoReMiGame'

type Props = {
  targetStep: ScaleStep
  targetFrequency: number
  currentFrequency: number | null
  centsFromTarget: number | null
  isSingingCorrectNote: boolean
  tooLowMs: number
  tooHighMs: number
}

const {
  targetStep,
  targetFrequency,
  currentFrequency,
  centsFromTarget,
  isSingingCorrectNote,
  tooLowMs,
  tooHighMs,
} = defineProps<Props>()

const showSingHigherArrow = computed(() => tooLowMs >= TOO_LOW_OR_HIGH_HINT_MS)
const showSingLowerArrow = computed(() => tooHighMs >= TOO_LOW_OR_HIGH_HINT_MS)

const { t } = useI18n()

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
const { fireMicroConfetti } = useConfetti(confettiCanvas)

const isAnimating = ref(false)

watch(
  () => targetStep.solfege,
  () => {
    isAnimating.value = false
    nextTick(() => {
      isAnimating.value = true
    })
    fireMicroConfetti()
  },
)

function onAnimationEnd() {
  isAnimating.value = false
}
</script>

<template>
  <div class="relative flex items-center gap-4">
    <canvas
      ref="confettiCanvas"
      class="pointer-events-none absolute inset-0 z-10"
    />
    <div class="flex items-center">
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
      />
    </div>

    <div>
      <div class="flex-flow flex items-center gap-2">
        <p class="text-sm text-(--p-text-muted-color)">
          {{ t('doReMi.singThisNote') }}
        </p>
        <div
          class="text-5xl font-bold"
          :class="[
            isSingingCorrectNote
              ? 'text-(--p-green-400)'
              : 'text-(--p-text-color)',
            isAnimating && 'animate-note-pop',
          ]"
          @animationend="onAnimationEnd"
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
              ? 'text-(--p-green-400)'
              : (centsFromTarget ?? 0) > 0
                ? 'text-(--p-orange-400)'
                : 'text-(--p-blue-400)',
          ]"
        >
          <span>{{ t('doReMi.cents') }} </span>
          <span class="tabular-nums">
            {{
              ((centsFromTarget ?? 0) > 0 ? '+' : '') + (centsFromTarget ?? 0)
            }}
          </span>
        </div>

        <p class="text-xs text-(--p-surface-500)">
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
          {{ t('doReMi.currentHz', { hz: Math.round(currentFrequency ?? 0) }) }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@keyframes note-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.3);
    text-shadow: 0 0 12px rgba(74, 222, 128, 0.8);
  }
  100% {
    transform: scale(1);
    text-shadow: none;
  }
}

.animate-note-pop {
  animation: note-pop 400ms ease-out;
}
</style>
