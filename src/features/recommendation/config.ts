import type { RoastLevelCode } from "@/domain/coffee/bean-profile";
import type { ActiveRecipeName } from "@/domain/recipe/types";
import type { TasteGoal } from "@/domain/taste/taste-goal";

import type { BrewingStrategy, RecommendationReason, StartingParameters } from "./types";

export const RECIPE_DEFAULTS = {
  "Three Pour": { coffeeDose: 15, targetBrewTimeMax: 160, targetBrewTimeMin: 135 },
  "4:6": { coffeeDose: 15, targetBrewTimeMax: 240, targetBrewTimeMin: 210 },
  "One Pour": { coffeeDose: 15, targetBrewTimeMax: 150, targetBrewTimeMin: 120 },
} as const satisfies Record<ActiveRecipeName, {
  coffeeDose: number;
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
}>;

export type StrategyRule = {
  reasons: readonly RecommendationReason[];
  recipeName: ActiveRecipeName;
  strategy: BrewingStrategy;
};

// No Taste Goal has a reviewed strategy rule in Recommendation Model v1 yet.
// Primary Taste Goal is the future lookup key; Secondary Taste Goal remains context only.
export const STRATEGY_RULES: Readonly<Partial<Record<TasteGoal, StrategyRule>>> = {};

// Three Pour is a deterministic product fallback, not a coffee-domain claim about
// any Bean Profile or Taste Goal being inherently best suited to this Recipe Template.
export const NEUTRAL_FALLBACK = {
  reasons: [
    {
      evidence: "product_heuristic",
      message: "Three Pour is Dialed's configured product fallback for a repeatable starting point, not a claim that it is optimal for this coffee.",
    },
  ],
  recipeName: "Three Pour",
  strategy: {
    approach: "Use a repeatable official V60 framework without attributing the choice to unreviewed coffee characteristics.",
    evidence: "neutral_fallback",
    id: "neutral_v60_baseline",
    name: "Neutral V60 baseline",
  },
} as const satisfies StrategyRule;

export type RoastStartingParameterRule = {
  overrides: Partial<Pick<StartingParameters, "grindLevel" | "ratio" | "waterTemperature">>;
  reason: RecommendationReason;
};

// Architectural extension point only. No reviewed Roast Level parameter rule is approved yet.
export const ROAST_STARTING_PARAMETER_RULES: Readonly<
  Partial<Record<RoastLevelCode, RoastStartingParameterRule>>
> = {};
