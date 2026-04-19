<script setup lang="ts">
import { programs } from '@/constants/programs'

const { t } = useI18n()
const { state: micPermission } = useMicrophonePermission()

const musicNoteColorClass = computed(() => {
  if (micPermission.value === 'granted') return 'text-green-400'
  if (micPermission.value === 'denied') return 'text-red-400'

  return ''
})
</script>

<template>
  <div class="flex grow flex-col items-center px-4 pt-1">
    <div class="flex flex-wrap items-center gap-2">
      <MusicNote :class="['h-9 w-auto', musicNoteColorClass]"></MusicNote>
      <h2 class="product-title mb-2 font-bold">{{ t('home.title') }}</h2>
    </div>

    <p class="mb-4 text-gray-400">{{ t('home.subtitle') }}</p>

    <div class="grid w-full max-w-lg gap-4">
      <RouterLink
        v-for="program in programs"
        :key="program.route"
        :to="program.route"
        class="block rounded-2xl border border-gray-800 bg-gray-900 p-3 transition-all hover:border-green-500 hover:bg-gray-800 sm:p-6"
      >
        <div class="flex items-start gap-3 sm:gap-4">
          <span class="text-4xl">{{ program.icon }}</span>
          <div>
            <h2 class="text-xl font-semibold">
              {{ t(`home.programs.${program.key}.name`) }}
            </h2>
            <p class="mt-1 text-sm text-gray-400">
              {{ t(`home.programs.${program.key}.description`) }}
            </p>
          </div>
        </div>
      </RouterLink>
    </div>

    <footer
      class="mt-auto flex w-full max-w-lg items-end justify-center gap-3 pt-8 pb-4 text-base text-gray-500"
    >
      <span>{{ t('home.privacy') }}</span>
      <a
        href="https://github.com/kunukn/singing-experience"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub repository"
        class="text-gray-600 transition-colors hover:text-gray-300"
      >
        <GitHubIcon :size="20" />
      </a>
    </footer>
  </div>
</template>

<style scoped>
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>
