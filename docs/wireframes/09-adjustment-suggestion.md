# Adjustment Decision

## Goal

Turn feedback into likely direction guidance and valid adjustment choices, then let the user choose ONE direction and ONE primary-variable change.

The completed decision must persist beyond this screen. Milestone 6 does not generate the next Brew Plan.

## Multiple Direction Choice

When feedback implies more than one valid direction, insert this step before candidates:

```text
┌─────────────────────────────┐
│ What should we improve      │
│ first?                      │
│                             │
│ You said                    │
│ Too sour · Too weak         │
│                             │
│ ○ Increase extraction      │
│   One possible next         │
│   direction for sourness.   │
│                             │
│ ○ Increase strength        │
│   Address the cup feeling   │
│   too weak.                 │
│                             │
│        [ Continue ]         │
└─────────────────────────────┘
```

Only one Adjustment Direction may continue into candidate selection. The directions are guidance, not extraction diagnoses.

## Candidate Choice

```text
┌─────────────────────────────┐
│ Next adjustment             │
│                             │
│ ★★★☆☆                      │
│                             │
│ You said                    │
│ Too sour                    │
│ Sweetness was low           │
│                             │
│ ─────────────────────────── │
│                             │
│ SELECTED DIRECTION          │
│ Increase extraction         │
│                             │
│ Choose ONE change           │
│                             │
│ ● RECOMMENDED               │
│   Grind finer               │
│                             │
│ ○ Increase temperature      │
│   Raise water temperature   │
│                             │
│ Milestone 7 will change     │
│ only your selected          │
│ variable.                   │
│                             │
│    [ Save adjustment ]      │
└─────────────────────────────┘
```

These are intent-only candidates. Exact grind and temperature magnitudes are resolved in Milestone 7, not saved by Milestone 6.

## Candidate Catalog v1

| Selected direction | Recommended | Alternative |
| --- | --- | --- |
| Increase extraction | Grind finer | Raise water temperature |
| Decrease extraction | Grind coarser | Lower water temperature |
| Increase strength | Use less water | — |
| Decrease strength | Use more water | — |
| Reduce astringency | Unsupported | — |
| Hold | No candidate | — |

Strength candidates keep coffee dose fixed and change water; ratio is derived. Exact water delta and resulting ratio belong to Milestone 7. Agitation, pour structure, brew time, recipe, dose, ratio, and other variables are not Candidate Catalog v1 parameters. Candidate evidence is currently `product_heuristic`.

## Saved State

```text
┌─────────────────────────────┐
│ Adjustment saved            │
│                             │
│ Next adjustment             │
│ Grind finer                 │
│                             │
│ This decision is pending.   │
│ The next Brew Plan will be  │
│ created in Milestone 7.     │
│                             │
│           [ Done ]          │
└─────────────────────────────┘
```

Milestone 6 persists the decision and ends. It does not create a Brew Plan.

The final `Done` destination is the related Coffee Detail route. It is the smallest existing route that preserves the relevant coffee context; Milestone 6 does not add a separate Dial-in history route.

## Pretty Good / Hold

```text
┌─────────────────────────────┐
│ Dialed in                   │
│                             │
│ Keep this brew unchanged.   │
│                             │
│ Your hold decision is       │
│ saved.                      │
│                             │
│           [ Done ]          │
└─────────────────────────────┘
```

Hold is an explicit persisted terminal decision. It has no recommended candidate, selected candidate, or fake no-op candidate.

## Unsupported Direction

```text
┌─────────────────────────────┐
│ Direction saved             │
│                             │
│ Reduce astringency          │
│                             │
│ Dialed does not yet have a  │
│ reviewed one-variable       │
│ adjustment for this         │
│ direction.                  │
│                             │
│           [ Done ]          │
└─────────────────────────────┘
```

`unsupported` preserves a valid selected direction and candidate knowledge version, but has no recommended or selected candidate. It is not `hold` and does not invent an unreviewed action.

## Context Boundary

The persisted Adjustment Decision retains:

- Taste Feedback relationship, and therefore the completed Brew Session and Dial-in Thread relationship
- Inferred directions presented to the user
- User-selected Adjustment Direction
- Interpretation / rule version
- Dialed recommended candidate snapshot when non-hold
- User-selected candidate snapshot when non-hold
- Candidate evidence / knowledge version
- Status: `pending`, `applied`, terminal `held`, or terminal `unsupported`

Unselected alternatives do not require persistent rows in MVP. Recommended and selected snapshots must both persist, including when they differ.

Candidate-bearing status is `pending` at the end of Milestone 6. Milestone 7 generates the next Brew Plan from the selected candidate and marks the decision `applied`. Candidate Snapshots preserve only parameter, change direction, evidence classification, and reason—not previous values, suggested values, or magnitude.

`reduce_astringency` ends as `unsupported` in Candidate Catalog v1. `hold` ends as `held`.

## Method Switching Boundary

Changing Recipe Template / brewing framework is not shown as a normal candidate because it can change multiple brewing conditions at once. It establishes a different baseline / Brewing Strategy.

Whether that baseline change stays in the same Dial-in Thread or creates a new Thread is intentionally unresolved; this wireframe does not decide it.
