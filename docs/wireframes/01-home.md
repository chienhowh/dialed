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