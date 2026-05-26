---
applyTo: 'src/locales/*.json'
---

# Translation instructions

This app is used by children as well as adults. All user-facing strings in `src/locales/*.json` should read as friendly, plain, everyday language — never bureaucratic, courtroom-formal, or technical-sounding.

## Tone rules

- **Plain words over technical compounds.** Prefer the everyday word a child would actually hear.
  - ❌ `Commence the activity` (formal, stiff)
  - ✅ `Let's start`
- **Use the casual "you" form** in languages that have one.
  - FR `tu` not `vous` (`Chante`, not `Chantez`)
  - ES `tú` not `usted` (`Pulsa`, `Mantén`)
  - DE `du` (already standard here — keep it)
  - ID `kamu` / `-mu` not `Anda`
  - PT casual `você` forms; drop `por favor`
- **Drop polite filler.** "Please", `Veuillez`, `Bitte`, `Por favor`, `Tafadhali`, `Пожалуйста`, `请`, `कृपया`, `অনুগ্রহ করে`, `يرجى` — all out.
  - ❌ `Please enable it in your browser settings`
  - ✅ `Turn it on in your browser settings`
- **No parenthetical plurals.** `tone(s)`, `Ton/Töne`, `tone(r)`, `tom(ns)` read like form letters. Use a plain plural instead.
  - ❌ `{count} tone(s) detected`
  - ✅ `{count} tones found`
- **Keep musical terminology.** Established music words stay (`soprano`, `baritone`, `cents`, `octave`, `do re mi`).
- **Never rename i18n keys to fit copy.** Keys are referenced from Vue components; only edit the string _values_ in `src/locales/*.json`. If the key name becomes misleading after rewording, leave it — a rename is a separate, code-touching change.

## Process

- When in doubt about a language you don't speak natively, change only the lowest-risk items (parenthetical plurals, dropping "please") and flag the file for native-speaker review. Don't guess.
- After editing locale files, run `npm run check:fix` — it validates the JSON and re-runs the build smoke check.
