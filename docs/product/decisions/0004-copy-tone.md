# 0004 — Child-friendly copy

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

The app is used by children as well as adults, in many languages. Machine-style or formal copy ("Commence the activity", "Please enable…", "tone(s) detected") reads as bureaucratic, and puts children off.

## Decision

Every user-facing string is friendly, plain, everyday language:

- the casual "you" form where a language has one
- no polite filler
- no parenthetical plurals
- established music words kept (soprano, cents, octave)

The per-language rules live in `.github/instructions/translation.instructions.md`, which agents load when touching `src/locales/*.json`.

## Alternatives considered

- **Neutral formal tone**, the default of most translation tools. Rejected: it reads stiff to children and inconsistent across languages.
- **Simplifying music terms away.** Rejected: singers meet these words everywhere else, so the app teaches them instead (glossary, "Words you'll see").

## Consequences

- Translations need a native-speaker check for tone, not only meaning; low-risk fixes (dropping "please", plain plurals) can be made without one.
- An i18n key isn't renamed to fit new copy; a rename is a separate, code-touching change.
