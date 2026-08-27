# Adjustment Suggestion

## Goal

Turn feedback into an actionable next Brew Plan.

The suggestion must persist beyond this screen.

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
│ Try changing ONE thing      │
│                             │
│ GRIND                       │
│                             │
│ Medium-fine                 │
│      ↓                      │
│ Slightly finer              │
│                             │
│ Keep everything else       │
│ unchanged.                  │
│                             │
│ [ Brew with adjustment ]    │
│                             │
│       Done for today        │
└─────────────────────────────┘
```

## Actions

### Brew with adjustment

Creates a new Brew Plan:

```text
Previous Brew Plan
+
Accepted Adjustment
=
Next Brew Plan
```

### Done for today

Returns to Coffee Detail / Home.

The pending adjustment remains visible in the Dial-in Thread.

## Persisted Context

Suggestion should retain:

- Based-on Brew Session
- Feedback reason
- Parameter to change
- Previous value
- Suggested direction/value
- Status: pending / accepted / ignored / superseded