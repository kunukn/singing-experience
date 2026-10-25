# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-25
Component: src/components/tuner/TunerDisplay.vue, src/components/ukulele/UkuleleDisplay.vue
Expected: The tuner's guitar and ukulele modes share one implementation of the in-tune bell and highlight
Actual: Each carries its own copy (grace timer, bell sustain, highlight debounce, cooldowns), so a fix to one silently misses the other — the grace-period fix 1b0e636 reached only guitar and needed ae276fc for ukulele
Repro: diff the "Bell feedback guards" blocks of the two files → near-identical code
Workaround: none — mirror every change by hand until extracted into a shared composable
