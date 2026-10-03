<script setup lang="ts">
import { groupSongIdsByDifficulty, type SongId } from './singTheKeysSongs'

/* Picks the song. Options are grouped by difficulty (easy first) so a singer
 * can tell what they are in for; inside a group they run A to Z by translated
 * title, so the order follows the active language. */
type Props = {
  disabled?: boolean
}

const props = defineProps<Props>()

const songId = defineModel<SongId>('songId', { required: true })

const { t, locale } = useI18n()

const songGroups = computed(() =>
  groupSongIdsByDifficulty().map(({ difficulty, songIds }) => ({
    difficulty,
    items: songIds
      .map((id) => ({ label: t(`singTheKeys.songs.${id}`), value: id }))
      .toSorted((a, b) => a.label.localeCompare(b.label, locale.value)),
  })),
)
</script>

<template>
  <PrimeSelect
    v-model="songId"
    :options="songGroups"
    optionLabel="label"
    optionValue="value"
    optionGroupLabel="difficulty"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
    :disabled="props.disabled"
    :ariaLabel="t('singTheKeys.song')"
  >
    <template #optiongroup="{ index, option }">
      <div
        class="song-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        {{ t(`generic.difficulty_${option.difficulty}`) }}
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.song-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
