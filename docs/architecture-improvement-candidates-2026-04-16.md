# Architecture Improvement Candidates

> Generated: 2026-04-16
> Tool: GitHub Copilot — improve-codebase-architecture skill

This document captures architectural friction points found in the codebase. The goal is to make modules deeper (small interface, large implementation) following John Ousterhout's *A Philosophy of Software Design* principles.

**Status: Paused after candidate identification — next step is to pick a candidate to explore.**

---

## Candidate 1 — `useDoReMiGame` + `usePitchDetection`: Hardcoded dependency kills testability

- **Cluster**: `useDoReMiGame.ts`, `usePitchDetection.ts`, `useSimulatedPitchDetection.ts`
- **Why coupled**: `useDoReMiGame` calls `usePitchDetection()` directly inside its body — no injection point. `useSimulatedPitchDetection` exists with an *identical interface* but can never be used by the game.
- **Dependency category**: True external (Mock) — requires `AudioContext` + `MediaStream` browser APIs
- **Test impact**: All game logic (hold timer, grace period, step advancement, cents detection) is completely untestable without real audio hardware. Every game test needs a full mock of the browser audio stack.

---

## Candidate 2 — `PitchHistoryChart.vue`: 536-line monolith, zero testable logic

- **Cluster**: `PitchHistoryChart.vue` (alone)
- **Why coupled**: Sample collection, smoothing, sustained-note detection, bezier canvas rendering, label positioning, and memory management all coexist in one file with no extractable functions.
- **Dependency category**: In-process — pure computation buried in side-effectful watcher callbacks
- **Test impact**: Zero tests exist. Sustained-note logic, smoothing algorithm, and marker placement are all hidden inside `watch()` callbacks with canvas side-effects.

---

## Candidate 3 — `useDoReMiPlaySequence` + `useTonePlayer`: Manual cleanup, implicit coupling, timer leaks

- **Cluster**: `useDoReMiPlaySequence.ts`, `useTonePlayer.ts`, `DoReMiPage.vue`
- **Why coupled**: `useDoReMiPlaySequence` calls `useTonePlayer()` internally (not injected), has no `onUnmounted` cleanup hook, and timers leak if the component is destroyed mid-sequence. Callers must manually call `stopSequence()` before `stop()`.
- **Dependency category**: True external (Mock) — Tone.js Web Audio
- **Test impact**: Can't test sequence timing or tone playback calls without Tone.js running. No automated cleanup means leaky test environments.

---

## Candidate 4 — Confetti service locator: Runtime registration, hidden test dependency

- **Cluster**: `useConfettiStore.ts`, `useConfetti.ts`, `App.vue`, `DoReMiPage.vue`
- **Why coupled**: `DoReMiPage` calls `useConfettiStore().fireConfetti()` which starts as a no-op. `App.vue` must register the real function at runtime. If the component is used outside `App` (in tests, Storybook, etc.) it silently fails.
- **Dependency category**: True external (Mock) — canvas confetti
- **Test impact**: Testing `isComplete → fireConfetti` requires bootstrapping the entire App context.

---

## Candidate 5 — `DoReMiScale.vue`: Fragile imperative ref array + complex conditional class bindings

- **Cluster**: `DoReMiScale.vue`
- **Why coupled**: Step status logic is duplicated in both a `stepStatus()` function and 10+ inline template class conditions. Ref array (`stepElements`) is populated imperatively inside `v-for`, making it fragile.
- **Dependency category**: In-process
- **Test impact**: Any refactor of step states breaks multiple class bindings simultaneously. Scroll behaviour is untestable without DOM layout.

---

## What's working well

- `noteUtils.ts` and `pitchColors.ts` are isolated, well-tested, pure functions
- `useTonePlayer.ts` has a clean API despite Tone.js complexity
- Page-level components are thin wrappers (good separation of concerns)
- Generic components (`CentsDeviationBar`, `BasicSelect`, etc.) are reusable
- Proper use of `readonly()` throughout composables to prevent reactive state mutations

---

## Next steps

1. Pick a candidate from the list above
2. The skill will frame the problem space and design 3+ interface alternatives in parallel
3. Pick the preferred interface design
4. A GitHub issue RFC will be created automatically

**Recommended starting point: Candidate 1** — it has the highest test-impact ROI and the existing `useSimulatedPitchDetection` (identical interface) makes the ports & adapters pattern a natural fit.
