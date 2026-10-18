# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-18
Component: src/locales/*.json (singTone.congratulationsMessage)
Expected: With Rounds set to 1 the Sing Tone end screen reads naturally, e.g. "You matched the tone in 1.6 seconds…"
Actual: It reads "You matched all 1 tones in 1.6 seconds with 0.1s hold duration!" — the message has no singular form
Repro: /sing-tone → Rounds 1 → Start → match the tone
Workaround: none
