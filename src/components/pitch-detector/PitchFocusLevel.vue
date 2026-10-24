<script setup lang="ts">
import type { FocusToneStats } from './focusToneTracker'
import {
  FOCUS_LEVEL_EMOJI,
  focusLevelFor,
  focusTipFor,
  type FocusLevel,
} from './focusLevel'
import PitchFocusLevelGuide from './PitchFocusLevelGuide.vue'

type Props = {
  stats: FocusToneStats
}

const props = defineProps<Props>()

const { t } = useI18n()

/* A ref rather than a computed: the next level depends on the one shown, so
 * a take near a boundary holds its rung instead of flickering */
const level = ref<FocusLevel | null>(null)
watch(
  () => props.stats,
  (stats) => {
    level.value = focusLevelFor(stats, level.value)
  },
  { immediate: true },
)
const tip = computed(() => focusTipFor(props.stats, level.value))
</script>

<template>
  <!-- The row keeps its height while empty, so the chart below doesn't jump
       as a take starts and the level appears -->
  <div
    class="flex min-h-7 flex-wrap items-baseline gap-x-3 gap-y-1"
    data-testid="pitch-focus-level"
    :data-level="level ?? ''"
    :data-tip="tip ?? ''"
  >
    <span v-if="level" class="text-lg font-bold">
      <span aria-hidden="true">{{ FOCUS_LEVEL_EMOJI[level] }}</span>
      {{ t(`pitchDetector.focus.levels.${level}`) }}
    </span>
    <span v-if="tip" class="text-sm text-(--p-text-muted-color)">
      {{ t(`pitchDetector.focus.tips.${tip}`) }}
    </span>
    <PitchFocusLevelGuide :level="level" class="ms-auto self-center" />
  </div>
</template>
