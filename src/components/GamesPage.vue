<script setup lang="ts">
import { games } from '@/constants/programs'

const { t } = useI18n()
const { warmUp: warmUpAudio } = useTonePlayer()

function prewarmAudio() {
  warmUpAudio().catch(() => {})
}
</script>

<template>
  <div class="flex grow flex-col items-center pt-1 pb-4">
    <h2 class="product-title mb-2 font-bold">{{ t('games.title') }}</h2>

    <p class="mb-4 text-(--p-text-muted-color)">
      {{ t('games.subtitle') }}
    </p>

    <div class="grid w-full max-w-lg gap-4" @click="prewarmAudio">
      <CardLink v-for="game in games" :key="game.route" :to="game.route">
        <PrimeCard>
          <template #content>
            <div class="flex items-start gap-3 sm:gap-4">
              <span class="text-4xl">{{ game.icon }}</span>
              <div>
                <h2 class="text-xl font-semibold">
                  {{ t(`home.programs.${game.key}.name`) }}
                </h2>
                <p class="mt-1 text-sm text-(--p-text-muted-color)">
                  {{ t(`home.programs.${game.key}.description`) }}
                </p>
              </div>
            </div>
          </template>
        </PrimeCard>
      </CardLink>
    </div>
  </div>
</template>

<style scoped lang="css">
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>
