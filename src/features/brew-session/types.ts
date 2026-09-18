import type { BrewStepType } from "@/domain/recipe/types";

export type GuidedBrewPlanStep = {
  duration: number | null;
  id: string;
  note: string | null;
  startTime: number;
  stepOrder: number;
  stepType: BrewStepType;
  targetWater: number | null;
};

export type GuidedBrewPlanSnapshot = {
  brewPlanId: string;
  coffeeDose: number;
  coffeeName: string;
  grindLevel: string;
  ratio: number;
  recipeName: string;
  steps: readonly GuidedBrewPlanStep[];
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  tasteGoal: string;
  waterAmount: number;
  waterTemperature: number;
};

export type LocalBrewStatus = "aborted_pending_sync" | "active" | "completed_pending_sync";

export type ActiveBrewRecord = {
  currentStepIndex: number;
  finishedAt: string | null;
  plan: GuidedBrewPlanSnapshot;
  sessionId: string;
  startedAt: string;
  status: LocalBrewStatus;
  version: 2;
};

export type BrewSessionStatus = "aborted" | "brewing" | "completed";

export type BrewSessionSyncInput = {
  brewPlanId: string;
  finishedAt: string | null;
  sessionId: string;
  startedAt: string;
  status: BrewSessionStatus;
};

export type BrewSessionSyncResult =
  | { sessionId: string; status: BrewSessionStatus; success: true }
  | { message: string; success: false };

export type BrewSession = {
  actualBrewTime: number | null;
  actualCoffeeDose: number | null;
  actualWaterAmount: number | null;
  actualWaterTemperature: number | null;
  brewPlanId: string;
  finishedAt: string | null;
  id: string;
  startedAt: string;
  status: BrewSessionStatus;
};
