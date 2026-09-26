# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---

2026-09-26
Component: src/components/sing-the-keys/SingTheKeysDisplay.vue
Expected: During a run only Stop shows; Start/Play again shows only while idle
Actual: With the guide on (unscored run) Start shows next to Stop — the Start button's v-else pairs with the tally span (v-if="isScoring"), not with Stop (v-if="isPlaying")
Repro: /sing-the-keys, Guide on, press Start — both Stop and Start are visible until the song ends
Workaround: none
