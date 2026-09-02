import { describe, expect, it } from "vitest";

import type { ActiveRecipeName, OfficialRecipeTemplate } from "@/domain/recipe/types";

import {
  PROCESS_RULE_WEIGHTS,
  RECIPE_DEFAULTS,
  REGION_RULE_WEIGHTS,
  ROAST_RULE_WEIGHTS,
  SECONDARY_TASTE_GOAL_MULTIPLIER,
  TASTE_GOAL_RULE_WEIGHTS,
} from "./config";
import { recommendBrewPlan } from "./recommend-brew-plan";

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

describe("recommendBrewPlan", () => {
  it("is deterministic and explains the rules that selected Three Pour", () => {
    const input = {
      beanProfile: { process: "washed" as const, region: "Sidama", roastLevel: "medium_light" as const },
      brewer: "v60" as const,
      primaryTasteGoal: "sweet" as const,
      secondaryTasteGoal: "clean" as const,
    };

    const first = recommendBrewPlan(input, recipes);
    const second = recommendBrewPlan(input, recipes);

    expect(second).toEqual(first);
    expect(first.recipeTemplate.name).toBe("Three Pour");
    expect(first.recipeScore.total).toBe(8);
    expect(first.reasoning).toContain(
      "No calibrated rule is defined for the free-form region “Sidama”, so region did not change the score.",
    );
    expect(first.reasoning.join(" ")).toContain("Washed process");
    expect(first.reasoning.join(" ")).toContain("Sweet favors");
    expect(first.reasoning.join(" ")).toContain("Clean favors");
  });

  it("uses the documented missing-region fallback", () => {
    const result = recommendBrewPlan(
      {
        beanProfile: { process: "natural", region: null, roastLevel: "medium_dark" },
        brewer: "v60",
        primaryTasteGoal: "full_body",
        secondaryTasteGoal: null,
      },
      recipes,
    );

    expect(result.recipeTemplate.name).toBe("One Pour");
    expect(result.reasoning).toContain(
      "Region was not provided, so the recommendation uses process, roast level, and taste goals as a conservative fallback.",
    );
  });

  it("gives secondary taste goals half their configured score", () => {
    const result = recommendBrewPlan(
      {
        beanProfile: { process: "other", region: null, roastLevel: "medium" },
        brewer: "v60",
        primaryTasteGoal: "bright",
        secondaryTasteGoal: "full_body",
      },
      recipes,
    );

    const onePour = result.scoreBreakdown.find(({ recipeName }) => recipeName === "One Pour");
    expect(onePour?.contributions).toContainEqual({
      points: 1,
      reason: "Full Body favors the rounder mouthfeel direction of One Pour.",
      rule: "secondary_taste_goal",
    });
  });

  it("uses a fixed tie-break order", () => {
    const result = recommendBrewPlan(
      {
        beanProfile: { process: "other", region: null, roastLevel: "medium" },
        brewer: "v60",
        primaryTasteGoal: "bright",
        secondaryTasteGoal: "full_body",
      },
      recipes,
    );

    expect(result.scoreBreakdown.map(({ recipeName }) => recipeName)).toEqual([
      "Three Pour",
      "4:6",
      "One Pour",
    ]);
  });

  it("rejects duplicate goals and non-V60 contexts", () => {
    expect(() => recommendBrewPlan({
      beanProfile: { process: "washed", region: null, roastLevel: "light" },
      brewer: "v60",
      primaryTasteGoal: "sweet",
      secondaryTasteGoal: "sweet",
    }, recipes)).toThrow("Secondary taste goal must differ");

    expect(() => recommendBrewPlan({
      beanProfile: { process: "washed", region: null, roastLevel: "light" },
      brewer: "chemex" as "v60",
      primaryTasteGoal: "sweet",
      secondaryTasteGoal: null,
    }, recipes)).toThrow("V60 only");
  });

  it("uses only the active official catalog and copies template steps", () => {
    const result = recommendBrewPlan(
      {
        beanProfile: { process: "washed", region: null, roastLevel: "light" },
        brewer: "v60",
        primaryTasteGoal: "sweet",
        secondaryTasteGoal: null,
      },
      recipes,
    );

    expect(result.scoreBreakdown.map(({ recipeName }) => recipeName).sort()).toEqual(
      ["Three Pour", "4:6", "One Pour"].sort(),
    );
    expect(result.steps).toEqual(result.recipeTemplate.steps);
    expect(result.steps).not.toBe(result.recipeTemplate.steps);
    expect(result.coffeeDose).toBe(15);
    expect(result.waterAmount).toBe(240);
  });
});

describe("recommendation configuration", () => {
  it("centralizes every calibratable rule and default", () => {
    expect(REGION_RULE_WEIGHTS).toEqual({});
    expect(PROCESS_RULE_WEIGHTS.washed["Three Pour"].points).toBe(3);
    expect(ROAST_RULE_WEIGHTS.light["4:6"].points).toBe(2);
    expect(TASTE_GOAL_RULE_WEIGHTS.juicy["4:6"].points).toBe(2);
    expect(SECONDARY_TASTE_GOAL_MULTIPLIER).toBe(0.5);
    expect(RECIPE_DEFAULTS["Three Pour"]).toEqual({
      coffeeDose: 15,
      targetBrewTimeMax: 160,
      targetBrewTimeMin: 135,
    });
  });
});
