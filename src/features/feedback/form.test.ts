import { describe, expect, it } from "vitest";

import { parseFeedbackFormData } from "./form";

function makeFormData(entries: Array<[string, string]>) {
  const formData = new FormData();
  for (const [key, value] of entries) formData.append(key, value);
  return formData;
}

describe("parseFeedbackFormData", () => {
  it("requires at least one Quick Feedback value", () => {
    expect(parseFeedbackFormData(makeFormData([]))).toMatchObject({
      errors: { quickFeedback: "Choose at least one thing you noticed." },
      success: false,
    });
  });

  it("accepts Pretty Good with optional descriptive feedback", () => {
    expect(parseFeedbackFormData(makeFormData([
      ["quickFeedback", "pretty_good"],
      ["overallRating", "5"],
      ["sweetness", "4"],
      ["flavorTags", "Floral"],
      ["customTags", " Jasmine, Peach "],
      ["notes", "  Clean finish  "],
    ]))).toEqual({
      data: expect.objectContaining({
        flavorTags: ["Floral", "Jasmine", "Peach"],
        notes: "Clean finish",
        overallRating: 5,
        pretty_good: true,
        sweetness: 4,
      }),
      success: true,
    });
  });

  it("accepts multiple negative signals", () => {
    const result = parseFeedbackFormData(makeFormData([
      ["quickFeedback", "too_sour"],
      ["quickFeedback", "too_weak"],
    ]));
    expect(result).toMatchObject({
      data: { pretty_good: false, too_sour: true, too_weak: true },
      success: true,
    });
  });

  it("rejects Pretty Good combined with a negative signal", () => {
    expect(parseFeedbackFormData(makeFormData([
      ["quickFeedback", "pretty_good"],
      ["quickFeedback", "too_sour"],
    ]))).toMatchObject({ errors: { quickFeedback: expect.any(String) }, success: false });
  });

  it("validates rating, tag, and notes shapes", () => {
    expect(parseFeedbackFormData(makeFormData([
      ["quickFeedback", "too_bitter"],
      ["flavorTags", "not-a-catalog-tag"],
      ["overallRating", "6"],
      ["customTags", "x".repeat(81)],
      ["notes", "x".repeat(4001)],
    ]))).toMatchObject({
      errors: {
        customTags: expect.any(String),
        flavorTags: expect.any(String),
        notes: expect.any(String),
        overallRating: expect.any(String),
      },
      success: false,
    });
  });
});
