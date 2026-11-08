# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-31
Component: src/components/sing-the-keys/SingTheKeysDisplay.vue (Tune hold bar)
Expected: The tune bar tracks the hold and visibly reaches full when the note is accepted
Actual: PrimeVue's built-in 1 s width transition on `.p-progressbar-value` makes the bar trail the real hold by up to a second, so it never shows full and drains on reset
Repro: Open Sing the Keys, press Tune, hold a note steady for 1.5 s and watch the bar
Workaround: none — the Voice Range Finder fixes the same issue with an inline `transition: none` through `:pt` (a Tailwind class loses to PrimeVue's unlayered style)

2026-11-08
Component: src/components/do-re-mi/DoReMiPage.vue (hold duration)
Expected: A hold duration picked in the settings row is still selected after a reload
Actual: The page's allowed list `[0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]` is shorter than the dropdown in DoReMiSettingsRow.vue, so 0.05, 0.2, 8 and 9 reset to the 0.75 default on load (and move the player to a different best-score entry)
Repro: Open DO RE MI, pick a 0.2 s hold, reload the page — hold is back to 0.75 s
Workaround: none
