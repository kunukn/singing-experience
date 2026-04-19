<script setup lang="ts">
const model = defineModel()
</script>

<template>
  <select v-model="model" class="my-select">
    <slot />
  </select>
</template>

<style scoped>
.my-select,
.my-select::picker(select) {
  appearance: base-select;
}

.my-select {
  border-radius: 0.5rem;
  border: 1px solid #4b5563;
  background: #1f2937;
  padding: 0.5rem 0.75rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #e5e7eb;
  outline: none;
  min-height: 2.5rem;
  height: 2.5rem;
}

@supports not selector(::picker(select)) {
  .my-select {
    min-height: 2.5rem;
    height: 2.5rem;
  }
}

.my-select:focus {
  border-color: #3b82f6;
}

.my-select::picker-icon {
  color: #9ca3af;
  transition: rotate 0.3s;
}

.my-select:open::picker-icon {
  rotate: 180deg;
}

.my-select::picker(select) {
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  background: #1f2937;
  padding: 0.375rem 0;
}
</style>

<style>
.my-select option {
  padding: 0.5rem 0.25rem;
  color: #f3f4f6;
}

.my-select option:hover {
  background: #374151;
}

.my-select option:checked {
  background: #2563eb;
  color: white;
}
</style>
