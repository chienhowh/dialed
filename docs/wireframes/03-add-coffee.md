# Add Coffee

## Goal

Create `Bean Profile + My Coffee` with as little friction as possible.

Adding a coffee must **not** ask for a Taste Goal.

## Wireframe

```text
┌─────────────────────────────┐
│ ← Add Coffee                │
│                             │
│ Origin *                    │
│ [ Ethiopia              ▼ ] │
│                             │
│ Region                      │
│ [ Sidama                  ] │
│                             │
│ Process *                   │
│ [ Washed                ▼ ] │
│                             │
│ Roast Level *               │
│ [ Light                 ▼ ] │
│                             │
│ Variety                     │
│ [ 74158                   ] │
│                             │
│ ─────────────────────────── │
│ More details              ↓ │
│                             │
│        [ Save Coffee ]      │
└─────────────────────────────┘
```

## Expanded Details

```text
Roaster
[ Simple Kaffa ]

Coffee Name
[ Hamasho ]

Producer / Farm
[              ]

Roast Date
[ YYYY / MM / DD ]

Purchase Place
[                 ]

Purchase Date
[ YYYY / MM / DD ]

Notes
[                 ]
```

## Success

After Save:

`Add Coffee → Coffee Detail`

Do **not** automatically start Taste Goal selection.

## Notes

- `Region` remains useful Bean Profile context, but is neutral in Recommendation Model v1 until calibrated rules exist. It does not block creation when unknown.
- Keep advanced origin data optional.
