# Coffee Detail

## Goal

This is the main hub for one `My Coffee`.

It must support two distinct intents:

1. Start a new brew with a new Taste Goal.
2. Continue an existing Dial-in.

## Wireframe

```text
┌─────────────────────────────┐
│ ←                           │
│                             │
│ Ethiopia Sidama             │
│ Washed · 74158 · Light      │
│ Simple Kaffa                │
│                             │
│      [ Brew This Coffee ]   │
│                             │
│ ─────────────────────────── │
│ CURRENT DIAL-INS            │
│                             │
│ Sweet + Clean               │
│ Last brew ★★★☆☆             │
│ Too sour                    │
│ Next: Grind finer           │
│ [ Continue ]                │
│                             │
│ Juicy + Bright              │
│ Last brew ★★★★☆             │
│ [ Continue ]                │
│                             │
│ ─────────────────────────── │
│ BEST BREWS                  │
│                             │
│ Sweet + Clean    ★★★★★      │
│ Three Pour                  │
│ 15g · 240g · 91°C           │
│ [ Brew Again ]              │
│                             │
│ Juicy + Bright   ★★★★☆      │
│ 4:6                         │
│ [ Brew Again ]              │
│                             │
│ ─────────────────────────── │
│ Brew History            →   │
│ Bean Details            →   │
└─────────────────────────────┘
```

## Primary Actions

### Brew This Coffee

Starts a new brew intent:

`Coffee Detail → Taste Goal`

### Continue

Continues a specific Dial-in Thread:

`Coffee Detail → Adjustment Suggestion / Next Brew Plan`

### Brew Again

Reuses the same immutable Brew Plan and starts a new Brew Session. It does not clone an identical Plan. The Brew Again UI belongs to M8.2.

## Notes

- One coffee may have multiple Dial-in Threads because Taste Goal can change by mood/day.
- Do not collapse all Dial-ins into one "current recipe".
- In M8.1, `Current Dial-ins` is the canonical per-Coffee recovery surface. Each compact Thread card shows Taste Goal, completed attempt count, latest completed brew/Feedback when available, and navigation to the existing canonical recovery route.
- A Thread can expose more than one actionable item. The primary item follows recovery priority; an inline expansion keeps every additional item reachable without adding a Thread route.
- M8.2 makes `Brew History` link to `/history?coffee={coffeeId}`. Full attempts and Brew Again live in History; Coffee Detail keeps compact recovery cards and does not add Best Brews or branch visualization.
