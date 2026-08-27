# Brew Plan

## Goal

Show the recommended starting point and make it immediately brewable.

Recommendation and Brew Plan are combined into one UX screen.

## Wireframe

```text
┌─────────────────────────────┐
│ ← Your Brew Plan            │
│                             │
│ Ethiopia · Sidama           │
│ Washed · Light              │
│                             │
│ FOR                         │
│ Sweet + Clean               │
│                             │
│ ┌─────────────────────────┐ │
│ │ Recommended             │ │
│ │ THREE POUR              │ │
│ │                         │ │
│ │ Sweetness    ●●●●○      │ │
│ │ Clarity      ●●●●○      │ │
│ │ Body         ●●○○○      │ │
│ │                         │ │
│ │ Why this brew?        ↓ │ │
│ └─────────────────────────┘ │
│                             │
│ 15g       240g       92°C   │
│ Coffee    Water       Temp  │
│                             │
│ Ratio 1:16 · Medium-fine    │
│                             │
│ 00:00   Bloom        → 40g  │
│ 00:40   Second      → 120g  │
│ 01:20   Final       → 240g  │
│                             │
│ Target finish  2:15–2:40    │
│                             │
│      [ Start Brewing ]      │
│                             │
│          Edit Plan          │
└─────────────────────────────┘
```

## Expanded Recommendation Reason

Example:

```text
Why this brew?

You selected Sweet + Clean.

This plan uses a balanced three-pour approach as a
starting point for this bean profile.

Recommended starting point — not a guaranteed best recipe.
```

## Edit Plan

Editable parameters may include:

- Coffee dose
- Water
- Ratio
- Temperature
- Grind level
- Steps / target water
- Target brew time

User edits should create the final Brew Plan snapshot used by the Session.

## Next

`Start Brewing → Guided Brew`