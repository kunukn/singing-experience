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
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="flex w-fit max-w-sm items-center gap-2 rounded-lg bg-red-600 py-2 pr-2 pl-4 text-sm text-white shadow-lg"
      >
        <span>{{ toast.message }}</span>
        <button
          class="cursor-pointer rounded-md px-2 py-0.5 font-bold text-white/80 transition-colors hover:bg-red-700 hover:text-white"
          @click="store.removeError(toast.id)"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
