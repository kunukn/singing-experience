<script setup lang="ts">
import type { Program } from '@/constants/programs'

const props = defineProps<{
  group: Program
  programs: readonly Program[]
}>()

/* Icons only, so 4 stay recognisable at phone width */
const PREVIEW_COUNT = 4

const { t } = useI18n()

const previewPrograms = computed(() =>
  props.programs
    .filter((program) => program.stage !== 'alpha')
    .slice(0, PREVIEW_COUNT),
)
const moreCount = computed(
  () => props.programs.length - previewPrograms.value.length,
)
</script>

<template>
  <CardLink :to="group.route" :data-group="group.key">
    <PrimeCard class="hero-card h-full">
      <template #content>
        <div class="flex items-start gap-4">
          <component :is="group.icon" class="size-14 shrink-0" />
          <div class="min-w-0 grow">
            <h2 class="text-2xl font-semibold">
              {{ t(`home.programs.${group.key}.name`) }}
            </h2>
            <p class="mt-1 text-base text-(--p-text-muted-color)">
              {{ t(`home.programs.${group.key}.description`) }}
            </p>
          </div>
        </div>

        <div class="mt-auto flex items-center gap-3 pt-4">
          <component
            :is="program.icon"
            v-for="program in previewPrograms"
            :key="program.route"
            class="size-10 shrink-0"
            aria-hidden="true"
          />
          <span
            v-if="moreCount > 0"
            class="text-base font-medium whitespace-nowrap text-(--p-text-muted-color)"
            data-testid="more-count"
          >
            {{ t('home.morePrograms', { count: moreCount }) }}
          </span>
          <i
            class="pi pi-chevron-right ms-auto text-(--p-text-muted-color) rtl:-scale-x-100"
            aria-hidden="true"
          />
        </div>
      </template>
    </PrimeCard>
  </CardLink>
</template>

<style scoped lang="css">
/* Stretch the card body so the icon strip sits on the bottom edge, level across both cards */
.hero-card :deep(.p-card-body),
.hero-card :deep(.p-card-content) {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
</style>
