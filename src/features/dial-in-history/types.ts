import type { QuickFeedback } from "@/domain/taste/feedback";
import type { TasteGoal } from "@/domain/taste/taste-goal";
import type {
  AdjustmentCandidateSnapshot,
  AdjustmentDecisionStatus,
  AdjustmentDirection,
} from "@/features/adjustment/types";
import type { RecommendationSource } from "@/features/brew-plan/types";
import type { BrewSessionStatus } from "@/features/brew-session/types";
import type { CoffeeStatus } from "@/features/coffee/types";

export type DialInHistoryCoffeeRecord = {
  displayName: string;
  id: string;
  status: CoffeeStatus;
  userId: string;
};

export type DialInHistoryThreadRecord = {
  coffeeId: string;
  createdAt: string;
  id: string;
  primaryTasteGoal: TasteGoal;
  secondaryTasteGoal: TasteGoal | null;
  updatedAt: string;
  userId: string;
};

export type DialInHistoryPlanRecord = {
  basedOnSessionId: string | null;
  coffeeDose: number;
  coffeeId: string;
  createdAt: string;
  dialInThreadId: string;
  grindLevel: string;
  id: string;
  parentPlanId: string | null;
  ratio: number;
  recommendationSource: RecommendationSource;
  recipeTemplateId: string | null;
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  userId: string;
  waterAmount: number;
  waterTemperature: number;
};

export type DialInHistoryRecipeTemplateRecord = {
  id: string;
  name: string;
};

export type DialInHistorySessionRecord = {
  actualBrewTime: number | null;
  brewPlanId: string;
  createdAt: string;
  finishedAt: string | null;
  id: string;
  startedAt: string;
  status: BrewSessionStatus;
  userId: string;
};

export type DialInHistoryFeedbackRecord = {
  acidity: number | null;
  body: number | null;
  brewSessionId: string;
  clarity: number | null;
  complexity: number | null;
  createdAt: string;
  flavorTags: string[];
  id: string;
  juiciness: number | null;
  notes: string | null;
  overallRating: number | null;
  quickFeedback: QuickFeedback[];
  sweetness: number | null;
  userId: string;
};

export type DialInHistoryDecisionRecord = {
  appliedBrewPlanId: string | null;
  createdAt: string;
  id: string;
  inferredDirections: AdjustmentDirection[];
  recommendedCandidate: AdjustmentCandidateSnapshot | null;
  selectedCandidate: AdjustmentCandidateSnapshot | null;
  selectedDirection: AdjustmentDirection;
  status: AdjustmentDecisionStatus;
  tasteFeedbackId: string;
  userId: string;
};

export type DialInHistorySource = {
  coffees: DialInHistoryCoffeeRecord[];
  decisions: DialInHistoryDecisionRecord[];
  feedback: DialInHistoryFeedbackRecord[];
  plans: DialInHistoryPlanRecord[];
  recipeTemplates: DialInHistoryRecipeTemplateRecord[];
  sessions: DialInHistorySessionRecord[];
  threads: DialInHistoryThreadRecord[];
};

export type DialInPlanSummary = Omit<DialInHistoryPlanRecord, "coffeeId" | "dialInThreadId" | "userId"> & {
  recipeTemplateName: string | null;
};

export type DialInFeedbackSummary = Omit<DialInHistoryFeedbackRecord, "brewSessionId" | "userId">;

export type DialInDecisionSummary = Omit<DialInHistoryDecisionRecord, "tasteFeedbackId" | "userId">;

export type DialInBrewAttempt = {
  actualBrewTime: number | null;
  activityTime: string;
  decision: DialInDecisionSummary | null;
  feedback: DialInFeedbackSummary | null;
  finishedAt: string | null;
  generatedNextPlanId: string | null;
  generatedNextPlanWasManuallyEdited: boolean;
  plan: DialInPlanSummary;
  sessionId: string;
  startedAt: string;
  status: BrewSessionStatus;
};

export type DialInActionKind =
  | "needs_feedback"
  | "needs_adjustment_decision"
  | "pending_adjustment"
  | "next_plan_ready"
  | "ready_to_brew";

export type DialInActionableItem = {
  activityTime: string;
  ctaLabel: string;
  href: string;
  id: string;
  kind: DialInActionKind;
  label: string;
  planId: string;
  sessionId: string | null;
};

export type DialInTerminalKind = "brewing" | "dialed_in" | "no_next_action" | "stopped" | "unsupported";

export type DialInTerminalSummary = {
  activityTime: string;
  kind: DialInTerminalKind;
  label: string;
};

export type DialInThreadSummary = {
  actionableItems: DialInActionableItem[];
  activityTime: string;
  attempts: DialInBrewAttempt[];
  coffeeId: string;
  coffeeName: string;
  coffeeStatus: CoffeeStatus;
  completedAttemptCount: number;
  createdAt: string;
  latestCompletedAttempt: DialInBrewAttempt | null;
  plans: DialInPlanSummary[];
  primaryTasteGoal: TasteGoal;
  secondaryTasteGoal: TasteGoal | null;
  tasteGoalLabel: string;
  terminalSummary: DialInTerminalSummary | null;
  threadId: string;
};

export type HomeDialInShortcut = {
  action: DialInActionableItem;
  additionalActionCount: number;
  coffeeId: string;
  coffeeName: string;
  tasteGoalLabel: string;
  threadId: string;
};
