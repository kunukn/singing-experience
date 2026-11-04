# Product Decision Records

Why the product rules in [design-rules.md](../design-rules.md) are what they are, including the options that were tried and rejected, so a settled question isn't reopened without new information.

Records are append-only. To change a decision, add a new record and mark the old one `Superseded by NNNN`; then update the rule in `design-rules.md`.

| #                                    | Decision                           | Status   |
| ------------------------------------ | ---------------------------------- | -------- |
| [0001](0001-pitch-accuracy-tiers.md) | Pitch accuracy tiers: 10/20/50¢    | Accepted |
| [0002](0002-vertical-ordering.md)    | More at the top                    | Accepted |
| [0003](0003-pitch-colours.md)        | Green clean, warm sharp, blue flat | Accepted |
| [0004](0004-copy-tone.md)            | Child-friendly copy                | Accepted |
| [0005](0005-button-conventions.md)   | Button conventions                 | Accepted |

## Template

```markdown
# NNNN — <decision in a few words>

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context

What problem or observation prompted this. Who is affected.

## Decision

The rule, in one or two sentences.

## Alternatives considered

What else was tried or proposed, and why it lost.

## Consequences

What this makes easier or harder; what guards it (tests, helpers).
```
