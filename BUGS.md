# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---


2026-09-20
Component: src/components/grace-kelly/GraceKellySettingsRow.vue:60
Expected: Building the BPM options list leaves the shared ALLOWED_BPMS constant untouched, the way NotesSettingsRow.vue:25 does with `[...ALLOWED_BPMS]`.
Actual: `ALLOWED_BPMS.sort((a, b) => b - a)` sorts the exported array from graceKellyConstants.ts in place, mutating a shared module constant on first render. Harmless today only because nothing else reads it in ascending order.
Repro: Open /grace-kelly, then inspect the imported ALLOWED_BPMS — it is descending, not the ascending order it was declared in.
Workaround: None needed yet. Fix is to spread before sorting.
