# Taste Goal

## Goal

Ask:

> How do you want this coffee to taste today?

Taste Goal is selected when preparing to brew, not when adding a coffee.

## Wireframe

```text
┌─────────────────────────────┐
│ ← Ethiopia Sidama           │
│                             │
│ How do you want it today?   │
│                             │
│ Choose your main goal       │
│                             │
│ ┌──────────┐ ┌──────────┐   │
│ │  Sweet   │ │  Bright  │   │
│ │    ✓     │ │          │   │
│ └──────────┘ └──────────┘   │
│                             │
│ ┌──────────┐ ┌──────────┐   │
│ │  Clean   │ │  Juicy   │   │
│ └──────────┘ └──────────┘   │
│                             │
│ ┌──────────┐ ┌──────────┐   │
│ │Full Body │ │ Balanced │   │
│ └──────────┘ └──────────┘   │
│                             │
│ ┌──────────┐                │
│ │ Complex  │                │
│ └──────────┘                │
│                             │
│ + Add secondary goal        │
│                             │
│      [ Find a Brew Plan ]   │
└─────────────────────────────┘
```

## Taste Goal Definitions

Short helper copy may be shown:

- Sweet — round, sweet-forward
- Bright — lively acidity
- Clean — clear and distinct
- Juicy — fruit-forward and mouthwatering
- Full Body — richer mouthfeel
- Balanced — no single dimension dominates
- Complex — layered and changing

## Behavior

- Primary Goal: required
- Secondary Goal: optional
- Primary Goal has greater influence than Secondary Goal; the UX does not imply a fixed numeric multiplier.
- Taste Goals express flavor direction. They do not permanently map to specific Recipe Templates.
- If no reviewed strategy supports a selected goal, continue with a conservative fallback rather than inventing a Recipe relationship.
- Starting a new Taste Goal can create a new Dial-in Thread.
- Reusing an existing Taste Goal may optionally connect to an existing Dial-in if the user chooses Continue instead.

## Next

`Taste Goal → Brew Plan`
