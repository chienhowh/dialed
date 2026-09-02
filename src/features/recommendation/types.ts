import type { ProcessCode, RoastLevelCode } from "@/domain/coffee/bean-profile";
import type { ActiveRecipeName, OfficialRecipeTemplate, RecipeStep } from "@/domain/recipe/types";
import type { TasteGoal } from "@/domain/taste/taste-goal";

export type RecommendationInput = {
  beanProfile: {
    process: ProcessCode;
    region: string | null;
    roastLevel: RoastLevelCode;
  };
  brewer: "v60";
  primaryTasteGoal: TasteGoal;
  secondaryTasteGoal: TasteGoal | null;
};

export type ScoreContribution = {
  points: number;
  reason: string;
  rule: "process" | "region" | "roast" | "primary_taste_goal" | "secondary_taste_goal";
};

export type RecipeScore = {
  contributions: readonly ScoreContribution[];
  recipeName: ActiveRecipeName;
  total: number;
};

export type RecommendedBrewPlan = {
  coffeeDose: number;
  expectedFlavor: string;
  grindLevel: string;
  ratio: number;
  reasoning: readonly string[];
  recipeScore: RecipeScore;
  recipeTemplate: OfficialRecipeTemplate;
  scoreBreakdown: readonly RecipeScore[];
  source: "official_rule";
  steps: readonly RecipeStep[];
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  waterAmount: number;
  waterTemperature: number;
};
