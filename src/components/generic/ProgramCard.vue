<script setup lang="ts">
import type { Program } from '@/constants/programs'

defineProps<{ program: Program }>()

const { t } = useI18n()
</script>

<template>
  <CardLink :to="program.route">
    <PrimeCard class="h-full">
      <template #content>
        <div class="flex items-start gap-3 sm:gap-4">
          <component :is="program.icon" class="size-10 shrink-0" />
          <div>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 class="text-xl font-semibold">
                {{ t(`home.programs.${program.key}.name`) }}
              </h3>
              <ProgramStageTag v-if="program.stage" :stage="program.stage" />
            </div>
            <p class="mt-1 text-sm text-(--p-text-muted-color)">
              {{ t(`home.programs.${program.key}.description`) }}
            </p>
          </div>
        </div>
      </template>
    </PrimeCard>
  </CardLink>
</template>
