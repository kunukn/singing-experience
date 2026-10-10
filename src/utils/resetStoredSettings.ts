/* Every setting the app stores starts with this — storageKeys.test.ts
 * enforces it, so clearing by prefix reaches all of them and nothing else. */
const SETTINGS_PREFIX = 'syng.'

/* Survives a reset: dropping back to English could leave someone unable to
 * read the app to set their language again. */
const KEPT_KEYS = ['syng.locale']

/*
 * Removes every stored setting, including keys left behind by renames, so the
 * app starts from its defaults on the next load. Callers reload afterwards:
 * settings already read into memory would otherwise write their old values
 * straight back.
 */
export function resetStoredSettings(
  storage: Pick<Storage, 'length' | 'key' | 'removeItem'> = localStorage,
) {
  /* Collect first — removing while iterating shifts the indices. */
  const keys: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key?.startsWith(SETTINGS_PREFIX) && !KEPT_KEYS.includes(key))
      keys.push(key)
  }

  for (const key of keys) storage.removeItem(key)
}
