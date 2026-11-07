<script setup lang="ts">
import { gameSections, games } from '@/constants/programs'
</script>

<template>
  <ProgramCatalogPage
    catalogKey="games"
    titleKey="home.programs.singingGames.name"
    :programs="games"
    :sectionOrder="gameSections"
  />
</template>
