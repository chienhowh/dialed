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
│        STEP 1 OF 3 · POUR    │
│                             │
│        TARGET WATER         │
│                             │
│             40g             │
│                             │
│           UP NEXT           │
│    00:40 · Pour to 120g     │
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

[ FINISH BREW ]
```

## Behavior

- Timer uses timestamps, not tick counters.
- Total Timer is session-level elapsed time derived from the original Session `started_at`.
- Tapping `NEXT` advances one local presentation step only. It does not create a Session, sync a step, or record an actual transition time.
- Step advancement is manual; the timer does not automatically advance the UI.
- Pour targets are cumulative Plan targets, not measured actual water.
- Current Plan, Session identity, original start time, and presentation step survive accidental reload/backgrounding.
- The final step replaces `NEXT` with `Finish Brew`; completion updates the same Session and routes to its exact Taste Feedback page.
- One Brew Plan execution equals one Brew Session. Refresh and step navigation do not create additional Sessions.
- Actual water should not be required during the brew.
- Optional vibration / notification can be considered if reliable in the PWA environment.

## Abort

Closing active brew should require a lightweight confirmation:

```text
Stop this brew?

[ Keep Brewing ]
[ End Session ]
```
