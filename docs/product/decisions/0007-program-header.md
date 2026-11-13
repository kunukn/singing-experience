# 0007 — One program header

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

Each game built its own heading, and they drifted. Of the seven games, Grace Kelly Challenge had no title at all and Note Rush had only just gained one. The gap between title and subtitle was 16px in three games, 8px in one and 0 in another. Three games removed the subtitle on the end screen, two of them inside a fixed-height wrapper added only to stop the page jumping, and one without it, so its layout shifted. Warm-up's heading said "Warm-up" while its card said "Vocal Warm-Up".

## Decision

One `ProgramHeader` component: the card name as the page title, an optional one-line subtitle 4px below it, and the subtitle hidden in place on end screens.

## Alternatives considered

- **Name in the top bar.** It would reach every program at once, but the bar is already full on a phone and has no room for a subtitle.
- **Remove the subtitle on the end screen.** That is what moved the layout and led to the fixed-height wrappers.
- **Keep the subtitle on the end screen.** Simpler, but "how to play" beside "Congratulations!" is noise.
- **A subtitle for every program.** Rejected for Grace Kelly Challenge: each of its tabs already says what to do, and a second line above the tabs would repeat one of them.
- **16px between title and subtitle**, as three games had. At that distance the subtitle reads as the first line of the content, not as part of the heading.

## Consequences

A new program gets the right heading by using the component. Warm-up's title now matches its card, and the `warmUp.title` string is gone. Eleven tools still have no header; adding one is a per-tool layout call, since their controls sit tighter.
