<script setup lang="ts">
import type { FocusToneStats } from './focusToneTracker'
import { FOCUS_LEVEL_EMOJI, focusLevelFor, focusTipFor } from './focusLevel'

type Props = {
  stats: FocusToneStats
}

const props = defineProps<Props>()

const { t } = useI18n()

const level = computed(() => focusLevelFor(props.stats))
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
  </div>
</template>
