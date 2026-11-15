# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-11-14
Component: src/components/grace-kelly/GraceKellySheet.vue
Expected: Every component has a caller.
Actual: `GraceKellySheet.vue` is dead code — nothing renders it; the sing tabs use `GraceKellySingSheet.vue` and the harmony tab `GraceKellyAllSheets.vue`. Two comments still name it.
Repro: grep -rn "GraceKellySheet\b" src — only components.d.ts and comments in GraceKellyAllSheets.vue / graceKellyStaffRender.ts match.
Workaround: none
