import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useErrorToastStore } from './useErrorToastStore'

describe('useErrorToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should add an error toast', () => {
    const store = useErrorToastStore()

    store.addError('Something went wrong')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Something went wrong')
  })

  test('should stack multiple error toasts', () => {
    const store = useErrorToastStore()

    store.addError('Error 1')
    store.addError('Error 2')

    expect(store.toasts).toHaveLength(2)
    expect(store.toasts[0].message).toBe('Error 1')
    expect(store.toasts[1].message).toBe('Error 2')
  })

  test('should remove an error toast by id', () => {
    const store = useErrorToastStore()

    store.addError('Error 1')
    store.addError('Error 2')
    const idToRemove = store.toasts[0].id

    store.removeError(idToRemove)

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Error 2')
  })

  test('should auto-remove toast after 5 seconds', () => {
    const store = useErrorToastStore()

    store.addError('Temporary error')
    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(5000)

    expect(store.toasts).toHaveLength(0)
  })

  test('should not auto-remove persistent toast after 5 seconds', () => {
    const store = useErrorToastStore()

    store.addError('Persistent error', { persistent: true })
    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(10000)

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Persistent error')
  })

  test('should remove persistent toast when dismissed manually', () => {
    const store = useErrorToastStore()

    store.addError('Persistent error', { persistent: true })
    const id = store.toasts[0].id

    store.removeError(id)

    expect(store.toasts).toHaveLength(0)
  })

  test('should not fail when removing a non-existent id', () => {
    const store = useErrorToastStore()

    store.removeError(999)

    expect(store.toasts).toHaveLength(0)
  })

  test('should keep at most 5 toasts and drop the oldest', () => {
    const store = useErrorToastStore()

    for (let i = 1; i <= 6; i++) {
      store.addError(`Error ${i}`, { persistent: true })
    }

    expect(store.toasts).toHaveLength(5)
    expect(store.toasts[0].message).toBe('Error 2')
    expect(store.toasts[4].message).toBe('Error 6')
  })

  test('should drop multiple oldest toasts when exceeding max', () => {
    const store = useErrorToastStore()

    for (let i = 1; i <= 8; i++) {
      store.addError(`Error ${i}`, { persistent: true })
    }

    expect(store.toasts).toHaveLength(5)
    expect(store.toasts[0].message).toBe('Error 4')
    expect(store.toasts[4].message).toBe('Error 8')
  })

  test('should auto-remove each toast independently', () => {
    const store = useErrorToastStore()

    store.addError('First')
    vi.advanceTimersByTime(3000)
    store.addError('Second')

    expect(store.toasts).toHaveLength(2)

    vi.advanceTimersByTime(2000)
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Second')

    vi.advanceTimersByTime(3000)
    expect(store.toasts).toHaveLength(0)
  })
})
