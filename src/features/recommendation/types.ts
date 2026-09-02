import type { OriginCode, ProcessCode, RoastLevelCode } from "@/domain/coffee/bean-profile";
import type { OfficialRecipeTemplate, RecipeStep } from "@/domain/recipe/types";
import type { TasteGoal } from "@/domain/taste/taste-goal";

export type RecommendationInput = {
  beanProfile: {
    originCountry: OriginCode;
    process: ProcessCode;
    region: string | null;
    roastLevel: RoastLevelCode;
    variety: string | null;
  };
  brewer: "v60";
  primaryTasteGoal: TasteGoal;
  secondaryTasteGoal: TasteGoal | null;
};

export type RecommendationEvidence = "method_supported" | "neutral_fallback" | "product_heuristic";

export type BrewingStrategy = {
  approach: string;
  evidence: RecommendationEvidence;
  id: string;
  name: string;
};

export type RecommendationReason = {
  evidence: RecommendationEvidence;
  message: string;
};

export type StartingParameters = {
  coffeeDose: number;
  expectedFlavor: string;
  grindLevel: string;
  ratio: number;
  steps: readonly RecipeStep[];
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  waterAmount: number;
  waterTemperature: number;
};

export type RecommendedBrewPlan = {
  reasons: readonly RecommendationReason[];
  recipeTemplate: OfficialRecipeTemplate;
  source: "official_rule";
  startingParameters: StartingParameters;
  strategy: BrewingStrategy;
};
