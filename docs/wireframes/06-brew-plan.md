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

## Adjusted Plan Review

`Continue Dial-in` redirects to this same screen after the atomic adjustment succeeds. The generated Plan is reviewed here before `Start Brewing`; it is not auto-started. It keeps its Previous Brew Adjustment provenance and remains editable until its first Brew Session. An explicit edit continues to use the existing manual override behavior.

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

Water、dose 與 ratio 必須一致；Pour cumulative targets 不倒退且 final Pour 等於 total Water；step times 依序前進且不可重疊。Save 以單一 transaction 同時更新 Plan 與 steps，invalid edit 不保存任何部分。

After a Brew Session has started, hide `Edit Plan` and show that the plan is locked to preserve its execution history.

## Next

`Start Brewing → Guided Brew`
