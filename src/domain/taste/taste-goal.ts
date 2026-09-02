export const TASTE_GOAL_CATALOG = [
  { description: "Round and sweet-forward", label: "Sweet", value: "sweet" },
  { description: "Lively acidity", label: "Bright", value: "bright" },
  { description: "Clear and distinct", label: "Clean", value: "clean" },
  { description: "Richer mouthfeel", label: "Full Body", value: "full_body" },
  { description: "Fruit-forward and mouthwatering", label: "Juicy", value: "juicy" },
  { description: "No single dimension dominates", label: "Balanced", value: "balanced" },
  { description: "Layered and changing", label: "Complex", value: "complex" },
] as const;

export type TasteGoal = (typeof TASTE_GOAL_CATALOG)[number]["value"];

const tasteGoals: ReadonlySet<string> = new Set(TASTE_GOAL_CATALOG.map(({ value }) => value));
const tasteGoalLabels = new Map(TASTE_GOAL_CATALOG.map(({ label, value }) => [value, label]));

export function isTasteGoal(value: string): value is TasteGoal {
  return tasteGoals.has(value);
}

export function getTasteGoalLabel(value: TasteGoal) {
  return tasteGoalLabels.get(value) ?? value;
}

export function formatTasteGoals(primary: TasteGoal, secondary: TasteGoal | null) {
  return secondary
    ? `${getTasteGoalLabel(primary)} + ${getTasteGoalLabel(secondary)}`
    : getTasteGoalLabel(primary);
}
