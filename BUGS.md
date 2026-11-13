# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-11-13
Component: src/composables/useVoiceRangeIndex.ts, src/composables/useVoiceRangeGroups.ts, src/components/generic/VoiceRangeSelect.vue
Expected: Every option and prop has a caller.
Actual: `allowedIndices` is dead code — warm-up was its only caller and now picks a start tone instead. The "warm-up hides the full range" comments on it are stale too.
Repro: grep -rn "allowedIndices" src — only the three files above and useVoiceRangeIndex.test.ts match.
Workaround: none
