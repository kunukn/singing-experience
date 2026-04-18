import { defineStore } from 'pinia'

type ErrorToast = {
  id: number
  message: string
}

export const useErrorToastStore = defineStore('errorToast', () => {
  const toasts = ref<ErrorToast[]>([])
  let nextId = 0

  function addError(message: string) {
    const id = nextId++
    toasts.value.push({ id, message })

    setTimeout(() => {
      removeError(id)
    }, 5000)
  }

  function removeError(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index === -1) return

    toasts.value.splice(index, 1)
  }

  return { toasts: readonly(toasts), addError, removeError }
})
