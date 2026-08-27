# Coffee Brewing Product — Low-fidelity Wireframes

These wireframes are derived from the current `PRODUCT.md`.

## Purpose

These documents define the current UX flow and screen-level behavior for the MVP.

They are **not visual design specifications**. Colors, typography, spacing, icons, and component styling are intentionally left open.

## Core UX Principles

1. Adding a coffee and deciding how to brew it are separate actions.
2. `Taste Goal` belongs to the current brew intent / Dial-in Thread, not to `My Coffee`.
3. The shortest new-brew path is:
   `My Coffee → Brew This Coffee → Taste Goal → Brew Plan → Guided Brew → Feedback`
4. A previous Dial-in can be continued without forcing the user to keep the same taste goal every day.
5. Brewing interaction must require minimal phone interaction.
6. Actual brew data should be captured automatically where possible and be optional to correct afterward.
7. Adjustment suggestions should remain available after the brew session and can be used to create the next Brew Plan.
8. `Brew` is an action, not a bottom-navigation destination.

## MVP Navigation

Bottom navigation:

- Home
- Coffee
- History

Secondary navigation:

- Settings / Profile

## Screens

1. `01-home.md`
2. `02-coffee-list.md`
3. `03-add-coffee.md`
4. `04-coffee-detail.md`
5. `05-taste-goal.md`
6. `06-brew-plan.md`
7. `07-guided-brew.md`
8. `08-brew-complete-feedback.md`
9. `09-adjustment-suggestion.md`
10. `10-history.md`

## Primary Flows

### New Coffee

`Home / Coffee → Add Coffee → Coffee Detail`

Adding a coffee does **not** immediately ask for a Taste Goal.

### New Brew

`Coffee Detail → Brew This Coffee → Taste Goal → Brew Plan → Guided Brew → Feedback`

### Continue Dial-in

`Home / Coffee Detail → Existing Dial-in → Adjustment Suggestion → Next Brew Plan → Guided Brew`

### Brew Again

`Coffee Detail / History → Previous Brew → Brew Again → New Brew Plan → Guided Brew`