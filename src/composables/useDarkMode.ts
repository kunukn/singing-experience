import { useLocalStorage } from '@vueuse/core'

const STORAGE_KEY = 'syng.darkMode'
const DARK_CLASS = 'p-dark'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = useLocalStorage(STORAGE_KEY, prefersDark)

function applyDarkMode(dark: boolean) {
  document.documentElement.classList.toggle(DARK_CLASS, dark)
}

export function useDarkMode() {
  applyDarkMode(isDark.value)
  watch(isDark, applyDarkMode)

  function toggleDark() {
    isDark.value = !isDark.value
  }

  return { isDark: readonly(isDark), toggleDark }
}
