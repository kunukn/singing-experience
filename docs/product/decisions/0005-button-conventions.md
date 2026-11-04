# 0005 — Button conventions

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Start, Stop, Record and Clear already looked alike across programs, but only button size was written down. The Voice Recorder drifted as a result: its Stop and Record buttons weren't rounded, its Record button was green where Song Recorder's is red, and its main analysis button had an icon. An audit of 30 Start, Stop and Record buttons found all 28 in other programs were `rounded` and `size="small"`. Every Clear had a bin icon except the one in Voice Range Finder.

## Decision

Write down what the programs already do: main actions are `rounded` with no icon, Start green and Stop red. Record is red with `pi pi-circle-fill`. Clear always has `pi pi-trash`, and its colour may suit its setting. Secondary buttons take the shape of whatever sits beside them.

## Alternatives considered

- **Icons on Stop and main actions.** The Voice Recorder's Stop briefly had one, and it was removed because no other program's Stop does.
- **Green Record, as a kind of Start.** Rejected: Song Recorder's is red, and red with a dot is the familiar sign for recording.
- **One fixed style for Clear.** Rejected as more churn than it's worth: the existing `secondary` and `text` variants each suit where they sit. The bin icon alone makes Clear recognisable.
- **Shape left to each setting.** Rejected: it allowed a square Clear beside a pill-shaped Record again, which looked like a mistake.

## Consequences

New buttons have a table to copy from. Nothing enforces it: a test would have to parse templates, which seemed heavier than the risk, so this relies on checking the rule and comparing with other programs.
