import type { BrewStepType } from "@/domain/recipe/types";
import type { TasteGoal } from "@/domain/taste/taste-goal";
import type { Coffee } from "@/features/coffee/types";

export type BrewPlanStep = {
  duration: number | null;
  id: string;
  note: string | null;
  startTime: number;
  stepOrder: number;
  stepType: BrewStepType;
  targetWater: number | null;
};

export type BrewPlan = {
  coffee: Coffee;
  coffeeDose: number;
  dialInThreadId: string;
  expectedFlavor: string;
  grindLevel: string;
  id: string;
  primaryTasteGoal: TasteGoal;
  ratio: number;
  recipeName: string | null;
  recipeTemplateId: string | null;
  recommendationReason: string;
  recommendationSource: "official_rule" | "manual";
  secondaryTasteGoal: TasteGoal | null;
  steps: BrewPlanStep[];
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  waterAmount: number;
  waterTemperature: number;
};

export type BrewPlanEditInput = {
  coffeeDose: number;
  grindLevel: string;
  ratio: number;
  steps: Array<Pick<BrewPlanStep, "duration" | "id" | "startTime" | "targetWater">>;
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  waterAmount: number;
  waterTemperature: number;
};
