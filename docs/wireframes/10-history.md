# Brew History

## Goal

Let the user review a practical `Coffee → Dial-in Thread → Brew attempts` timeline, recover unfinished work, and repeat an exact Brew Plan.

One Brew attempt is one Brew Session. `Brew #N` is presentation-only chronological numbering inside one Thread and does not imply linear Plan ancestry.

## Wireframe

```text
┌──────────────────────────────────┐
│ Brew History                     │
│                                  │
│ Ethiopia Sidama    Coffee Details│
│                                  │
│ ▼ SWEET + CLEAN                   │
│   2 completed · Latest Sep 8     │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Brew #1 · Sep 6             │ │
│ │ Completed                    │ │
│ │                              │ │
│ │ PLAN                         │ │
│ │ Three Pour                   │ │
│ │ 15g · 240g · 1:16 · 92°C    │ │
│ │ Medium-fine · 2:15–2:40     │ │
│ │                              │ │
│ │ ACTUAL                       │ │
│ │ Finish 2:31                  │ │
│ │                              │ │
│ │ FEEDBACK                     │ │
│ │ ★★★☆☆ · Too sour            │ │
│ │                              │ │
│ │ ADJUSTMENT                   │ │
│ │ Dialed suggested Grind finer│ │
│ │ You chose Grind finer        │ │
│ │ Next Brew Plan created      │ │
│ │ [ View Next Brew Plan ]      │ │
│ │ [ Brew Again ]               │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Brew #2 · Sep 8             │ │
│ │ Completed · Dialed in        │ │
│ │ ★★★★★ · Pretty good          │ │
│ │ Keep this brew unchanged     │ │
│ │ [ Brew Again ]               │ │
│ └──────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│ Home         Coffee       History│
└──────────────────────────────────┘
```

## Recovery states

- completed Session without Feedback → `Give Feedback`
- Feedback without Decision → `Choose Adjustment`
- pending Decision → primary `Continue Dial-in`, secondary `Brew Again`
- applied Decision with unstarted Plan → separate `Next brew ready` card and `Review Next Brew`
- initial unstarted Plan → separate `Brew Plan ready` card and `Review Brew Plan`
- DB-only brewing Session → `Brew in progress`, no Resume CTA
- aborted Session → `Stopped`, no Feedback CTA, `Brew Again`
- held Decision → `Dialed in` / `Keep this brew unchanged`, `Brew Again`
- unsupported Decision → `No supported adjustment`, `Brew Again`

## Data semantics

- Historical parameters and recipe steps always come from Brew Plan／Brew Plan Steps snapshots.
- The current accessible Recipe Template name may be bulk-loaded as a display-only identity label. It is not presented as a brew-time name/version snapshot; missing names fall back to `Brew Plan`.
- Only measured persisted Session values are shown as actual; initialized dose/water/temperature are not described as actual.
- Same-Plan Sessions remain separate attempts and may say `Same plan as previous brew`.
- Applied Plans attach to the exact causal Session. Chronological display does not imply a single parent-child chain.
- A manually edited applied Plan says `Adjusted plan was edited before brewing`; exact pre-edit generated values are not reconstructed.

## Brew Again

`Brew Again → same immutable Brew Plan review (/brew/{planId}) → existing Start Brewing flow → new Brew Session`

History performs no mutation. It does not clone a Plan, create a Thread, rerun Recommendation, or apply an adjustment.

## Scope

- Optional Coffee filter uses `/history?coffee={coffeeId}`.
- No advanced filters, pagination, dedicated Thread route, branch tree, Best Brews, analytics, community, or AI in M8.
