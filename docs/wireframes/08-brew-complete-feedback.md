# Brew Complete / Feedback

## Goal

Allow the user to finish the brew and record useful feedback in ~10 seconds.

Detailed data is optional.

## Wireframe

```text
┌─────────────────────────────┐
│ Brew complete ☕            │
│                             │
│            2:31             │
│                             │
│ Target 2:15–2:40            │
│                             │
│ How was it?                 │
│                             │
│   ☆   ☆   ☆   ☆   ☆        │
│                             │
│ What did you notice? *      │
│                             │
│ [ Pretty good ]             │
│                             │
│ [ Too sour ] [ Too bitter ] │
│ [ Too weak ] [ Too strong ] │
│ [ Astringent ]              │
│                             │
│ + Add sensory details       │
│                             │
│          [ Save ]           │
└─────────────────────────────┘
```

## Detailed Sensory Feedback

```text
Sweetness
● ● ● ● ○

Acidity
● ● ● ○ ○

Body
● ● ○ ○ ○

Clarity
● ● ● ● ○

Juiciness
● ● ● ● ○

Complexity
● ● ● ○ ○

Flavor notes
[ Floral ] [ Citrus ] [ Berry ]
[ Nutty ]  [ Chocolate ] ...

Notes
[                         ]
```

## Quick Feedback Behavior

- At least ONE Quick Feedback selection is required.
- Negative Quick Feedback is multi-select. `Too Sour + Too Weak` and `Too Bitter + Astringent` are valid.
- Selecting `Pretty Good` clears and disables every negative Quick Feedback selection.
- Selecting any negative Quick Feedback clears `Pretty Good`.
- `Pretty Good` may still be combined with Overall Rating, Detailed Sensory Feedback, Flavor Tags, and Notes.

Submitted Taste Feedback is an immutable historical observation snapshot. MVP provides no edit or delete UI after Save.

## Milestone 8.4 Route and Recovery Behavior

- `Finish Brew` completes the existing Session once, then navigates directly to `/brew/{planId}/session/{sessionId}/feedback`.
- The route combines `Brew Complete` and Quick Taste Feedback; there is no standalone confirmation or extra Continue step.
- The detailed disclosure is collapsed by default. Its controls stay mounted, so closing and reopening it preserves entered values.
- Submission belongs to the exact completed Session and uses the existing conflict-safe M6 Feedback flow. It creates no Session and does not clone or mutate the Brew Plan.
- Existing Feedback renders its persisted Decision／adjustment recovery state rather than a fresh blank form.
- History and Coffee Detail `Give Feedback`／`Choose Adjustment`／`Continue Dial-in` links continue to target this canonical route.

## Notes

- Do not require detailed sensory feedback.
- Overall preference and sensory characteristics are separate concepts.
- High acidity is not automatically a negative outcome.
- Do not infer a brewing diagnosis directly from a feedback label.
- Actual-value correction is future/backlog work and is not shown in Milestone 8.4. Plan-derived session dose, water, and temperature are not labeled as measured actuals; no per-step timing or water is created.

## Next

For one negative direction:

`Save → Selected Adjustment Direction → Adjustment Choices`

For multiple inferred directions:

`Save → “What should we improve first?” → User selects ONE direction → Adjustment Choices`

For Pretty Good:

`Save → Persist hold decision → Dialed in → Done`

For Astringent when it is the selected direction:

`Save → Persist unsupported decision → Explain that Candidate Catalog v1 has no reviewed one-variable change → Done`
