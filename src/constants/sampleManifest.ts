/*
 * Single source of truth for instrument sample files.
 *
 * Used by:
 *   - src/composables/toneEngine.ts → Tone.Sampler `urls` maps (note → file)
 *   - vite.config.ts → Workbox `additionalManifestEntries` (precache list)
 *
 * Keeping both consumers wired to the same maps prevents the precache from
 * drifting out of sync with what the samplers actually load. URLs are
 * relative to Vite's BASE_URL (the Sampler's `baseUrl` prepends it).
 */

export type SampleMap = Record<string, string>

export const mySamples: SampleMap = {}

export const allSampleUrls: string[] = Object.values(mySamples)
