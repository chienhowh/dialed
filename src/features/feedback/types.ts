import type { SensoryRating, TasteFeedbackSignals } from "@/domain/taste/feedback";

export type TasteFeedbackInput = TasteFeedbackSignals & Record<SensoryRating, number | null> & {
  flavorTags: string[];
  notes: string | null;
  overallRating: number | null;
};

export type TasteFeedback = TasteFeedbackInput & {
  brewSessionId: string;
  createdAt: string;
  id: string;
};

export type FeedbackFlowContext = {
  coffeeId: string;
  session: {
    actualBrewTime: number | null;
    brewPlanId: string;
    id: string;
    status: "aborted" | "brewing" | "completed";
  };
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
};
