# Adjustment Suggestion

## Goal

Turn feedback into a desired direction and valid adjustment choices, then let the user choose ONE primary-variable change for the next Brew Plan.

The suggestion must persist beyond this screen.

This wireframe describes the future adjustment behavior. Milestone 4.1 does not implement it.

## Wireframe

```text
┌─────────────────────────────┐
│ Next brew                   │
│                             │
│ ★★★☆☆                      │
│                             │
│ You said                    │
│ Too sour                    │
│ Sweetness was low           │
│                             │
│ ─────────────────────────── │
│                             │
│ DESIRED DIRECTION           │
│ Increase extraction         │
│                             │
│ Choose ONE change           │
│                             │
│ ● RECOMMENDED               │
│   Grind finer               │
│   Medium-fine → finer       │
│                             │
│ ○ Increase temperature      │
│   92°C → 93°C               │
│                             │
│ ○ Adjust pour structure     │
│   Increase agitation        │
│                             │
│ The next plan changes only  │
│ your selected variable.     │
│ Keep everything else        │
│ unchanged.                  │
│                             │
│ [ Create next Brew Plan ]   │
│                             │
│       Done for today        │
└─────────────────────────────┘
```

## Actions

### Create next Brew Plan

Creates a new Brew Plan:

```text
Previous Brew Plan
+
User-selected ONE-variable Adjustment
=
Next Brew Plan
```

Dialed ranks and preselects one recommended candidate. The user may select another valid candidate before creating the plan.

### Done for today

Returns to Coffee Detail / Home.

The pending adjustment remains visible in the Dial-in Thread.

## Context Boundary

The existing persisted suggestion retains:

- Based-on Brew Session
- Feedback reason
- Parameter to change
- Previous value
- Suggested direction/value
- Status: pending / accepted / ignored / superseded

The future choice UX also needs access to:

- Desired Adjustment Direction
- Recommended candidate
- Alternative valid candidates
- User-selected candidate

Whether the candidate set is persisted or deterministically regenerated is intentionally unresolved. Milestone 4.1 does not change the schema.

## Method Switching Boundary

Changing Recipe Template / brewing framework is not shown as a normal candidate because it can change multiple brewing conditions at once. It establishes a different baseline / Brewing Strategy.

Whether that baseline change stays in the same Dial-in Thread or creates a new Thread is intentionally unresolved; this wireframe does not decide it.
