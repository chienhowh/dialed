import {
  FLAVOR_TAG_CATALOG,
  isQuickFeedback,
  NEGATIVE_QUICK_FEEDBACK,
  SENSORY_RATING_CATALOG,
  type QuickFeedback,
} from "@/domain/taste/feedback";

import type { TasteFeedbackInput } from "./types";

export type FeedbackFormValues = {
  customTags: string;
  flavorTags: string[];
  notes: string;
  overallRating: string;
  quickFeedback: QuickFeedback[];
} & Record<(typeof SENSORY_RATING_CATALOG)[number]["value"], string>;

export type FeedbackFormState = {
  errors?: Partial<Record<keyof FeedbackFormValues, string>>;
  message?: string;
  values?: FeedbackFormValues;
};

export const initialFeedbackFormState: FeedbackFormState = {};

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readRating(value: string) {
  if (!value) return { valid: true as const, value: null };
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5
    ? { valid: true as const, value: parsed }
    : { valid: false as const, value: null };
}

function uniqueTags(tags: readonly string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseFeedbackFormData(formData: FormData):
  | { data: TasteFeedbackInput; success: true }
  | { errors: NonNullable<FeedbackFormState["errors"]>; success: false; values: FeedbackFormValues } {
  const rawQuickFeedback = formData.getAll("quickFeedback");
  const quickFeedback = [...new Set(
    rawQuickFeedback.filter((value): value is QuickFeedback => typeof value === "string" && isQuickFeedback(value)),
  )];
  const rawFlavorTags = formData.getAll("flavorTags");
  const selectedFlavorTags = rawFlavorTags
    .filter((value): value is string => (
      typeof value === "string" && FLAVOR_TAG_CATALOG.some((tag) => tag === value)
    ));
  const customTags = readString(formData, "customTags");
  const notes = readString(formData, "notes");
  const values: FeedbackFormValues = {
    acidity: readString(formData, "acidity"),
    body: readString(formData, "body"),
    clarity: readString(formData, "clarity"),
    complexity: readString(formData, "complexity"),
    customTags,
    flavorTags: selectedFlavorTags,
    juiciness: readString(formData, "juiciness"),
    notes,
    overallRating: readString(formData, "overallRating"),
    quickFeedback,
    sweetness: readString(formData, "sweetness"),
  };
  const errors: NonNullable<FeedbackFormState["errors"]> = {};

  if (rawQuickFeedback.some((value) => typeof value !== "string" || !isQuickFeedback(value))) {
    errors.quickFeedback = "Choose valid feedback options.";
  } else if (quickFeedback.length === 0) {
    errors.quickFeedback = "Choose at least one thing you noticed.";
  } else if (
    quickFeedback.includes("pretty_good")
    && NEGATIVE_QUICK_FEEDBACK.some((value) => quickFeedback.includes(value))
  ) {
    errors.quickFeedback = "Pretty good cannot be combined with another quick feedback option.";
  }

  if (rawFlavorTags.some((value) => (
    typeof value !== "string" || !FLAVOR_TAG_CATALOG.some((tag) => tag === value)
  ))) {
    errors.flavorTags = "Choose valid flavor tags.";
  }

  const ratings = {
    acidity: readRating(values.acidity),
    body: readRating(values.body),
    clarity: readRating(values.clarity),
    complexity: readRating(values.complexity),
    juiciness: readRating(values.juiciness),
    overallRating: readRating(values.overallRating),
    sweetness: readRating(values.sweetness),
  };
  for (const [field, result] of Object.entries(ratings) as Array<[keyof typeof ratings, { valid: boolean }]>) {
    if (!result.valid) errors[field] = "Choose a rating from 1 to 5.";
  }

  const customFlavorTags = customTags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const flavorTags = uniqueTags([...selectedFlavorTags, ...customFlavorTags]);
  if (flavorTags.length > 20 || flavorTags.some((tag) => tag.length > 80)) {
    errors.customTags = "Use at most 20 flavor tags, with 80 characters or fewer per tag.";
  }
  if (notes.length > 4000) errors.notes = "Use 4000 characters or fewer.";

  if (Object.keys(errors).length > 0) return { errors, success: false, values };

  const selected = new Set<QuickFeedback>(quickFeedback);
  return {
    data: {
      acidity: ratings.acidity.value,
      astringent: selected.has("astringent"),
      body: ratings.body.value,
      clarity: ratings.clarity.value,
      complexity: ratings.complexity.value,
      flavorTags,
      juiciness: ratings.juiciness.value,
      notes: notes || null,
      overallRating: ratings.overallRating.value,
      pretty_good: selected.has("pretty_good"),
      sweetness: ratings.sweetness.value,
      too_bitter: selected.has("too_bitter"),
      too_sour: selected.has("too_sour"),
      too_strong: selected.has("too_strong"),
      too_weak: selected.has("too_weak"),
    },
    success: true,
  };
}
