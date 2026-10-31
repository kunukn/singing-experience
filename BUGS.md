# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-31
Component: src/components/sing-the-keys/SingTheKeysDisplay.vue (Tune hold bar)
Expected: The tune bar tracks the hold and visibly reaches full when the note is accepted
Actual: PrimeVue's built-in 1 s width transition on `.p-progressbar-value` makes the bar trail the real hold by up to a second, so it never shows full and drains on reset
Repro: Open Sing the Keys, press Tune, hold a note steady for 1.5 s and watch the bar
Workaround: none — the Voice Range Finder fixes the same issue with an inline `transition: none` through `:pt` (a Tailwind class loses to PrimeVue's unlayered style)
