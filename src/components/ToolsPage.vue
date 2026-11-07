<script setup lang="ts">
import { toolSections, tools } from '@/constants/programs'
</script>

<template>
  <ProgramCatalogPage
    catalogKey="tools"
    titleKey="home.programs.singingTools.name"
    :programs="tools"
    :sectionOrder="toolSections"
  />
</template>
