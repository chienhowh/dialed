# Home

## Goal

Answer the user's immediate question:

> What am I brewing today?

Home should make both **starting a new brew** and **continuing an existing Dial-in** easy.

## Default State

```text
┌─────────────────────────────┐
│ Coffee                 ⚙    │
│                             │
│ What are you brewing today? │
│                             │
│ MY COFFEE                   │
│ ┌─────────────────────────┐ │
│ │ Ethiopia Sidama        │ │
│ │ Washed · Light         │ │
│ │ Simple Kaffa           │ │
│ │               [ Brew ] │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ Kenya Nyeri            │ │
│ │ Washed · Light         │ │
│ │               [ Brew ] │ │
│ └─────────────────────────┘ │
│                             │
│ CONTINUE DIAL-IN            │
│ ┌─────────────────────────┐ │
│ │ Ethiopia Sidama        │ │
│ │ Sweet + Clean          │ │
│ │ Last ★★★☆☆            │ │
│ │ Too sour               │ │
│ │                        │ │
│ │ Next: Grind finer      │ │
│ │            [ Continue ]│ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ Home      Coffee     History│
└─────────────────────────────┘
```

## Empty State

```text
┌─────────────────────────────┐
│ Coffee                 ⚙    │
│                             │
│                             │
│      What are you           │
│      brewing today?         │
│                             │
│  Add your first coffee and  │
│  find a starting brew plan. │
│                             │
│      [ + Add Coffee ]       │
│                             │
│                             │
├─────────────────────────────┤
│ Home      Coffee     History│
└─────────────────────────────┘
```

## Primary Actions

- `Brew` → Taste Goal
- `Continue` → Existing Dial-in / next adjusted Brew Plan
- `Add Coffee` → Add Coffee

## Notes

- Continue Dial-in is a shortcut, not the primary obligation.
- Do not assume the user wants the same Taste Goal as yesterday.
- A coffee can appear in both My Coffee and Continue Dial-in.
- M8.1 shows one primary actionable shortcut per Thread. If more work exists, the card says how many additional items need attention and links to Coffee Detail.
- Shortcut labels may be `Give Feedback`, `Choose Adjustment`, `Continue Dial-in`, `Review Next Brew`, or `Review Brew Plan`; navigation returns to existing canonical routes and performs no mutation on Home.
- A DB-only `brewing` Session is not shown as resumable. Resume requires the matching device-local active-brew record and is outside the M8.1 server read model.
