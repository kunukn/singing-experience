<script setup lang="ts">
import { games, programs, tools } from '@/constants/programs'

const { t } = useI18n()

const sections = [
  { title: 'Hubs', items: programs },
  { title: 'Tools', items: tools },
  { title: 'Games', items: games },
]

/* Detail check, card size, tile list size, landing-page list size */
const iconSizeClasses = ['size-16', 'size-10', 'size-6', 'size-5']
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
    <h1 class="text-2xl font-semibold">Program icons (Test)</h1>

    <section v-for="section in sections" :key="section.title">
      <h2 class="mb-2 text-lg font-semibold">{{ section.title }}</h2>
      <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <li
          v-for="program in section.items"
          :key="program.key"
          :data-program="program.key"
          class="flex items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-2"
        >
          <component
            v-for="sizeClass in iconSizeClasses"
            :key="sizeClass"
            :is="program.icon"
            :class="[sizeClass, 'shrink-0']"
          />
          <span class="text-sm">{{
            t(`home.programs.${program.key}.name`)
          }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
