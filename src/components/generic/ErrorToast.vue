<script setup lang="ts">
import { useErrorToastStore } from '@/stores/useErrorToastStore'

const store = useErrorToastStore()
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-4 z-50 flex flex-col-reverse items-center gap-2"
  >
    <TransitionGroup
      enterActiveClass="transition duration-300 ease-out"
      enterFromClass="translate-y-4 opacity-0"
      enterToClass="translate-y-0 opacity-100"
      leaveActiveClass="transition duration-200 ease-in"
      leaveFromClass="translate-y-0 opacity-100"
      leaveToClass="translate-y-4 opacity-0"
    >
      <button
        v-for="toast in store.toasts"
        :key="toast.id"
        class="w-fit max-w-sm cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        @click="store.removeError(toast.id)"
      >
        {{ toast.message }}
      </button>
    </TransitionGroup>
  </div>
</template>
