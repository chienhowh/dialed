import type { ProcessCode, RoastLevelCode } from "@/domain/coffee/bean-profile";
import type { ActiveRecipeName } from "@/domain/recipe/types";
import type { TasteGoal } from "@/domain/taste/taste-goal";

type WeightedPreference = {
  points: number;
  reason: string;
};

type RecipeWeights = Partial<Record<ActiveRecipeName, WeightedPreference>>;

export const RECIPE_DEFAULTS = {
  "Three Pour": { coffeeDose: 15, targetBrewTimeMax: 160, targetBrewTimeMin: 135 },
  "4:6": { coffeeDose: 15, targetBrewTimeMax: 240, targetBrewTimeMin: 210 },
  "One Pour": { coffeeDose: 15, targetBrewTimeMax: 150, targetBrewTimeMin: 120 },
} as const satisfies Record<ActiveRecipeName, {
  coffeeDose: number;
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
}>;

export const RECIPE_TIE_BREAK_ORDER = ["Three Pour", "4:6", "One Pour"] as const;

// Region remains free-form in MVP. No region-to-recipe correlations are claimed until
// a reviewed mapping exists; unknown and missing values intentionally use a neutral fallback.
export const REGION_RULE_WEIGHTS = {} as const satisfies Readonly<Record<string, RecipeWeights>>;

export const PROCESS_RULE_WEIGHTS = {
  washed: {
    "Three Pour": { points: 3, reason: "Washed process supports a structured, clarity-forward multi-pour starting point." },
    "4:6": { points: 2, reason: "Washed process can suit the separation of a staged 4:6 approach." },
  },
  natural: {
    "Three Pour": { points: 1, reason: "Three Pour remains a measured starting point for a natural process." },
    "4:6": { points: 2, reason: "The staged 4:6 approach can present an expressive natural process." },
    "One Pour": { points: 3, reason: "Natural process favors the round, approachable profile of One Pour." },
  },
  honey: {
    "Three Pour": { points: 3, reason: "Honey process favors the balanced structure of Three Pour." },
    "4:6": { points: 1, reason: "4:6 remains an expressive option for a honey process." },
    "One Pour": { points: 2, reason: "One Pour supports a round starting point for a honey process." },
  },
  other: {},
} as const satisfies Record<ProcessCode, RecipeWeights>;

export const ROAST_RULE_WEIGHTS = {
  light: {
    "Three Pour": { points: 1, reason: "Light roast keeps Three Pour in consideration for balanced extraction." },
    "4:6": { points: 2, reason: "Light roast favors the expressive profile of 4:6." },
  },
  medium_light: {
    "Three Pour": { points: 2, reason: "Medium Light roast favors the balanced Three Pour baseline." },
    "4:6": { points: 1, reason: "Medium Light roast can support an expressive 4:6 baseline." },
  },
  medium: {
    "Three Pour": { points: 2, reason: "Medium roast favors the balanced Three Pour baseline." },
    "One Pour": { points: 1, reason: "Medium roast can suit the rounder One Pour profile." },
  },
  medium_dark: {
    "Three Pour": { points: 1, reason: "Three Pour remains a measured option for Medium Dark roast." },
    "One Pour": { points: 2, reason: "Medium Dark roast favors the rounder One Pour baseline." },
  },
  dark: {
    "One Pour": { points: 2, reason: "Dark roast favors the simple, round One Pour baseline." },
  },
} as const satisfies Record<RoastLevelCode, RecipeWeights>;

export const TASTE_GOAL_RULE_WEIGHTS = {
  sweet: {
    "Three Pour": { points: 2, reason: "Sweet favors the balanced sweetness direction of Three Pour." },
    "One Pour": { points: 1, reason: "Sweet also supports the round profile of One Pour." },
  },
  bright: {
    "Three Pour": { points: 1, reason: "Three Pour can retain a bright but balanced profile." },
    "4:6": { points: 2, reason: "Bright favors the expressive profile of 4:6." },
  },
  clean: {
    "Three Pour": { points: 2, reason: "Clean favors the clarity direction of Three Pour." },
    "4:6": { points: 1, reason: "Clean also keeps the staged 4:6 approach in consideration." },
  },
  full_body: {
    "Three Pour": { points: 1, reason: "Three Pour can provide body while staying balanced." },
    "One Pour": { points: 2, reason: "Full Body favors the rounder mouthfeel direction of One Pour." },
  },
  juicy: {
    "Three Pour": { points: 1, reason: "Three Pour can keep a juicy profile balanced." },
    "4:6": { points: 2, reason: "Juicy favors the expressive profile of 4:6." },
  },
  balanced: {
    "Three Pour": { points: 2, reason: "Balanced directly favors the Three Pour baseline." },
    "4:6": { points: 1, reason: "4:6 remains an expressive but balanced option." },
    "One Pour": { points: 1, reason: "One Pour remains a round but balanced option." },
  },
  complex: {
    "Three Pour": { points: 1, reason: "Three Pour can keep a complex profile structured." },
    "4:6": { points: 2, reason: "Complex favors the layered, staged 4:6 approach." },
  },
} as const satisfies Record<TasteGoal, RecipeWeights>;

export const SECONDARY_TASTE_GOAL_MULTIPLIER = 0.5;
