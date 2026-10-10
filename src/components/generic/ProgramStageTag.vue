<script setup lang="ts">
import type { ProgramStage } from '@/constants/programs'

const props = defineProps<{ stage: ProgramStage }>()

const stageLabels: Record<ProgramStage, string> = {
  alpha: 'Alpha',
  beta: 'Beta',
}

/* Alpha is the most brittle, so it keeps the warning colour; beta is calmer */
const stageSeverities: Record<ProgramStage, 'warn' | 'info'> = {
  alpha: 'warn',
  beta: 'info',
}
</script>

<template>
  <PrimeTag
    :severity="stageSeverities[props.stage]"
    :value="stageLabels[props.stage]"
  />
</template>
