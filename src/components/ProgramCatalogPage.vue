<script setup lang="ts">
import {
  groupProgramsBySection,
  type Program,
  type ProgramSection,
} from '@/constants/programs'

const props = defineProps<{
  /* i18n namespace holding `subtitle` and `sections.*`: 'tools' or 'games' */
  catalogKey: 'tools' | 'games'
  titleKey: string
  programs: readonly Program[]
  sectionOrder: readonly ProgramSection[]
}>()

const { t } = useI18n()
const { warmUp: warmUpAudio } = useTonePlayer()

const groups = computed(() =>
  groupProgramsBySection(props.programs, props.sectionOrder),
)

function prewarmAudio() {
  warmUpAudio().catch(() => {})
}
</script>

<template>
  <div class="flex grow flex-col items-center pt-1 pb-4">
    <h1 class="product-title mb-2 font-bold">{{ t(titleKey) }}</h1>

    <p class="mb-4 text-(--p-text-muted-color)">
      {{ t(`${catalogKey}.subtitle`) }}
    </p>

    <div
      class="flex w-full max-w-lg flex-col gap-6 md:max-w-none"
      @click="prewarmAudio"
    >
      <section
        v-for="group in groups"
        :key="group.key"
        :data-section="group.key"
        :aria-labelledby="`section-${group.key}`"
      >
        <h2
          :id="`section-${group.key}`"
          class="mb-3 text-lg font-semibold text-(--p-text-muted-color)"
        >
          {{ t(`${catalogKey}.sections.${group.key}`) }}
        </h2>
        <div class="grid gap-4 md:grid-cols-2">
          <ProgramCard
            v-for="program in group.programs"
            :key="program.route"
            :program
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="css">
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>
