export const QUICK_FEEDBACK_CATALOG = [
  { label: "Pretty good", value: "pretty_good" },
  { label: "Too sour", value: "too_sour" },
  { label: "Too bitter", value: "too_bitter" },
  { label: "Too weak", value: "too_weak" },
  { label: "Too strong", value: "too_strong" },
  { label: "Astringent", value: "astringent" },
] as const;

export type QuickFeedback = (typeof QUICK_FEEDBACK_CATALOG)[number]["value"];

export const NEGATIVE_QUICK_FEEDBACK = [
  "too_sour",
  "too_bitter",
  "too_weak",
  "too_strong",
  "astringent",
] as const satisfies readonly QuickFeedback[];

export const SENSORY_RATING_CATALOG = [
  { label: "Sweetness", value: "sweetness" },
  { label: "Acidity", value: "acidity" },
  { label: "Body", value: "body" },
  { label: "Clarity", value: "clarity" },
  { label: "Juiciness", value: "juiciness" },
  { label: "Complexity", value: "complexity" },
] as const;

export type SensoryRating = (typeof SENSORY_RATING_CATALOG)[number]["value"];

export const FLAVOR_TAG_CATALOG = [
  "Floral",
  "Citrus",
  "Berry",
  "Tropical Fruit",
  "Stone Fruit",
  "Nutty",
  "Chocolate",
  "Caramel",
  "Tea-like",
] as const;

export function isQuickFeedback(value: string): value is QuickFeedback {
  return QUICK_FEEDBACK_CATALOG.some((item) => item.value === value);
}

export type TasteFeedbackSignals = Record<QuickFeedback, boolean>;
