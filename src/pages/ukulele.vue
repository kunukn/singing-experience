<script setup lang="ts">
const router = useRouter()
router.replace({ path: '/tuner', query: { tab: 'ukulele' } })
</script>

<template>
  <div data-page="ukulele" />
</template>
