# Guided Brew

## Goal

Guide the user through the current Brew Plan with minimal interaction.

The user may be holding a kettle, so controls must be large and simple.

## Ready State

```text
┌─────────────────────────────┐
│ ×                           │
│                             │
│ Ethiopia Sidama             │
│ Sweet + Clean               │
│                             │
│ 15g · 240g · 92°C           │
│                             │
│ Three Pour                  │
│                             │
│           Ready?            │
│                             │
│          [ START ]          │
└─────────────────────────────┘
```

## Active State

```text
┌─────────────────────────────┐
│ ×                           │
│                             │
│            00:23            │
│                             │
│            BLOOM            │
│                             │
│          Pour to            │
│                             │
│             40g             │
│                             │
│       Next at 00:40         │
│                             │
│                             │
│      ┌───────────────┐      │
│      │     NEXT      │      │
│      └───────────────┘      │
│                             │
│      ① ━━━ ② ─── ③          │
└─────────────────────────────┘
```

## Final Step

```text
01:24

FINAL POUR

Pour to
240g

[ FINISH ]
```

## Behavior

- Timer uses timestamps, not tick counters.
- Tapping `NEXT` records actual transition time.
- Current session state should survive accidental reload/backgrounding.
- Actual water should not be required during the brew.
- Optional vibration / notification can be considered if reliable in the PWA environment.

## Abort

Closing active brew should require a lightweight confirmation:

```text
Stop this brew?

[ Keep Brewing ]
[ End Session ]
```