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
│ │ Recommended start       │ │
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

No reviewed strategy rule is available for the primary
Sweet goal. Clean remains secondary context and did not
change this starting point. Dialed used its neutral V60
baseline.

Three Pour is the configured product fallback for a
repeatable start, not a claim that it is optimal.

Recommended starting point — not a guaranteed best recipe.
```

Recommendation reasons show only rules actually applied. Copy must distinguish conservative product heuristics from stronger method/domain-supported behavior and must not imply that a neutral Bean Profile attribute selected the Recipe.

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

After a Brew Session has started, hide `Edit Plan` and show that the plan is locked to preserve its execution history.

## Next

`Start Brewing → Guided Brew`
