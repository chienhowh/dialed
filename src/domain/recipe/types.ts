export const ACTIVE_RECIPE_NAMES = ["Three Pour", "4:6", "One Pour"] as const;

export type ActiveRecipeName = (typeof ACTIVE_RECIPE_NAMES)[number];
export type BrewStepType = "pour" | "wait";

export type RecipeStep = {
  duration: number | null;
  note: string | null;
  startTime: number;
  stepOrder: number;
  stepType: BrewStepType;
  targetWater: number | null;
};

export type OfficialRecipeTemplate = {
  brewerType: "v60";
  defaultGrindLevel: string;
  defaultRatio: number;
  defaultTemperature: number;
  description: string;
  expectedFlavor: string;
  id: string;
  isPublic: true;
  name: ActiveRecipeName;
  source: "official";
  steps: readonly RecipeStep[];
};

export function isActiveRecipeName(value: string): value is ActiveRecipeName {
  return (ACTIVE_RECIPE_NAMES as readonly string[]).includes(value);
}
