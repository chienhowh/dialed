import { describe, expect, it } from "vitest";

import type { ActiveRecipeName, OfficialRecipeTemplate } from "@/domain/recipe/types";
import { TASTE_GOAL_CATALOG } from "@/domain/taste/taste-goal";

import {
  NEUTRAL_FALLBACK,
  RECIPE_DEFAULTS,
  ROAST_STARTING_PARAMETER_RULES,
  STRATEGY_RULES,
} from "./config";
import { recommendBrewPlan } from "./recommend-brew-plan";
import type { RecommendationInput } from "./types";

function recipe(name: ActiveRecipeName): OfficialRecipeTemplate {
  const defaults = {
    "Three Pour": { flavor: "Balanced sweetness and clarity", grind: "medium-fine" },
    "4:6": { flavor: "Bright, expressive, and balanced", grind: "medium-coarse" },
    "One Pour": { flavor: "Round body and approachable sweetness", grind: "medium" },
  }[name];

  return {
    brewerType: "v60",
    defaultGrindLevel: defaults.grind,
    defaultRatio: 16,
    defaultTemperature: 92,
    description: `${name} fixture`,
    expectedFlavor: defaults.flavor,
    id: name,
    isPublic: true,
    name,
    source: "official",
    steps: [
      { duration: null, note: "Bloom", startTime: 0, stepOrder: 1, stepType: "pour", targetWater: 40 },
      { duration: null, note: "Final", startTime: 40, stepOrder: 2, stepType: "pour", targetWater: 240 },
    ],
  };
}

const recipes = [recipe("Three Pour"), recipe("4:6"), recipe("One Pour")];

function recommendationInput(
  beanProfile: Partial<RecommendationInput["beanProfile"]> = {},
  goals: Partial<Pick<RecommendationInput, "primaryTasteGoal" | "secondaryTasteGoal">> = {},
): RecommendationInput {
  return {
    beanProfile: {
      originCountry: "ET",
      process: "washed",
      region: "Sidama",
      roastLevel: "light",
      variety: "74158",
      ...beanProfile,
    },
    brewer: "v60",
    primaryTasteGoal: "sweet",
    secondaryTasteGoal: null,
    ...goals,
  };
}

describe("recommendBrewPlan", () => {
  it("returns a deterministic neutral starting strategy without a score contract", () => {
    const input = recommendationInput({}, { secondaryTasteGoal: "clean" });
    const first = recommendBrewPlan(input, recipes);
    const second = recommendBrewPlan(input, recipes);

    expect(second).toEqual(first);
    expect(first.strategy).toEqual(NEUTRAL_FALLBACK.strategy);
    expect(first.recipeTemplate.name).toBe("Three Pour");
    expect(first).not.toHaveProperty("recipeScore");
    expect(first).not.toHaveProperty("scoreBreakdown");
    expect(first).not.toHaveProperty("points");
  });

  it.each([
    ["Process", { process: "natural" as const }],
    ["Region", { region: "Nyeri" }],
    ["Origin", { originCountry: "KE" as const }],
    ["Variety", { variety: "SL28" }],
    ["Roast Level", { roastLevel: "dark" as const }],
  ])("keeps %s neutral in Recommendation Model v1", (_label, beanProfile) => {
    const baseline = recommendBrewPlan(recommendationInput(), recipes);
    const changed = recommendBrewPlan(recommendationInput(beanProfile), recipes);

    expect(changed).toEqual(baseline);
  });

  it.each(TASTE_GOAL_CATALOG)("uses the fallback for unsupported $label behavior", ({ label, value }) => {
    const result = recommendBrewPlan(recommendationInput({}, { primaryTasteGoal: value }), recipes);

    expect(result.strategy.id).toBe("neutral_v60_baseline");
    expect(result.recipeTemplate.name).toBe("Three Pour");
    expect(result.reasons[0]).toEqual({
      evidence: "neutral_fallback",
      message: `No reviewed strategy rule is available for the primary ${label} goal. Dialed used its neutral V60 baseline.`,
    });
  });

  it("uses Primary Taste Goal as the strategy lookup and keeps Secondary Taste Goal as context", () => {
    const withSecondary = recommendBrewPlan(
      recommendationInput({}, { primaryTasteGoal: "sweet", secondaryTasteGoal: "clean" }),
      recipes,
    );
    const swapped = recommendBrewPlan(
      recommendationInput({}, { primaryTasteGoal: "clean", secondaryTasteGoal: "sweet" }),
      recipes,
    );

    expect(withSecondary.strategy).toEqual(swapped.strategy);
    expect(withSecondary.startingParameters).toEqual(swapped.startingParameters);
    expect(withSecondary.reasons[0].message).toContain("primary Sweet goal");
    expect(withSecondary.reasons[0].message).toContain("Clean remains secondary context");
    expect(swapped.reasons[0].message).toContain("primary Clean goal");
  });

  it("explains only the applied neutral fallback and product heuristic", () => {
    const result = recommendBrewPlan(
      recommendationInput({}, { primaryTasteGoal: "bright", secondaryTasteGoal: "complex" }),
      recipes,
    );
    const explanation = result.reasons.map(({ message }) => message).join(" ");

    expect(result.reasons.map(({ evidence }) => evidence)).toEqual(["neutral_fallback", "product_heuristic"]);
    expect(explanation).toContain("neutral V60 baseline");
    expect(explanation).toContain("configured product fallback");
    expect(explanation).not.toMatch(/washed|Sidama|light|74158|score|points/i);
  });

  it("copies the selected Recipe Template into starting parameters", () => {
    const result = recommendBrewPlan(recommendationInput(), recipes);

    expect(result.startingParameters).toMatchObject({
      coffeeDose: 15,
      expectedFlavor: "Balanced sweetness and clarity",
      grindLevel: "medium-fine",
      ratio: 16,
      targetBrewTimeMax: 160,
      targetBrewTimeMin: 135,
      waterAmount: 240,
      waterTemperature: 92,
    });
    expect(result.startingParameters.steps).toEqual(result.recipeTemplate.steps);
    expect(result.startingParameters.steps).not.toBe(result.recipeTemplate.steps);
    expect(result.startingParameters.steps[0]).not.toBe(result.recipeTemplate.steps[0]);
  });

  it("requires the configured fallback Recipe Template", () => {
    expect(() => recommendBrewPlan(recommendationInput(), [recipe("4:6"), recipe("One Pour")]))
      .toThrow("Official recipe Three Pour is unavailable for the selected strategy.");
  });

  it("rejects duplicate goals and non-V60 contexts", () => {
    expect(() => recommendBrewPlan(
      recommendationInput({}, { primaryTasteGoal: "sweet", secondaryTasteGoal: "sweet" }),
      recipes,
    )).toThrow("Secondary taste goal must differ");

    expect(() => recommendBrewPlan({ ...recommendationInput(), brewer: "chemex" as "v60" }, recipes))
      .toThrow("V60 only");
  });
});

describe("recommendation knowledge", () => {
  it("contains no unreviewed Taste Goal or Roast Level rules", () => {
    expect(STRATEGY_RULES).toEqual({});
    expect(ROAST_STARTING_PARAMETER_RULES).toEqual({});
    expect(NEUTRAL_FALLBACK.recipeName).toBe("Three Pour");
    expect(RECIPE_DEFAULTS["Three Pour"]).toEqual({
      coffeeDose: 15,
      targetBrewTimeMax: 160,
      targetBrewTimeMin: 135,
    });
  });
});
