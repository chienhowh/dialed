import { notFound, redirect } from "next/navigation";

import { AdjustmentFlow } from "@/components/adjustment/adjustment-flow";
import { AdjustmentResult } from "@/components/adjustment/adjustment-result";
import { TasteFeedbackForm } from "@/components/feedback/taste-feedback-form";
import { QUICK_FEEDBACK_CATALOG } from "@/domain/taste/feedback";
import { continueDialInAction, saveAdjustmentDecisionAction } from "@/features/adjustment/actions";
import { interpretTasteFeedback } from "@/features/adjustment/interpret";
import { getAdjustmentDecisionByFeedback } from "@/features/adjustment/repository";
import { requireUser } from "@/features/auth/require-user";
import { formatSeconds } from "@/features/brew-plan/display";
import { submitTasteFeedbackAction } from "@/features/feedback/actions";
import { getFeedbackFlowContext, getTasteFeedbackBySession } from "@/features/feedback/repository";

type FeedbackPageProps = {
  params: Promise<{ brewPlanId: string; sessionId: string }>;
};

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { brewPlanId, sessionId } = await params;
  const { supabase, user } = await requireUser();
  const context = await getFeedbackFlowContext(supabase, user.id, brewPlanId, sessionId);
  if (!context) notFound();
  if (context.session.status === "brewing") redirect(`/brew/${brewPlanId}/start`);
  if (context.session.status !== "completed") notFound();

  const feedback = await getTasteFeedbackBySession(supabase, user.id, sessionId);
  const decision = feedback
    ? await getAdjustmentDecisionByFeedback(supabase, user.id, feedback.id)
    : null;
  if (decision) {
    const continueAction = continueDialInAction.bind(null, decision.id);
    return <AdjustmentResult coffeeId={context.coffeeId} continueAction={continueAction} decision={decision} />;
  }

  const feedbackAction = submitTasteFeedbackAction.bind(null, brewPlanId, sessionId);
  const adjustmentAction = saveAdjustmentDecisionAction.bind(null, brewPlanId, sessionId);
  const inferredDirections = feedback ? interpretTasteFeedback(feedback) : [];

  return (
    <section aria-labelledby="brew-complete-heading" className="mx-auto max-w-lg py-8 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brew Complete</p>
      <h1 id="brew-complete-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        {feedback ? "Choose your next adjustment" : "How was it?"}
      </h1>
      {context.session.actualBrewTime !== null ? (
        <>
          <p className="mt-5 text-sm text-[var(--muted)]">Actual brew time</p>
          <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">{formatSeconds(context.session.actualBrewTime)}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Target {formatSeconds(context.targetBrewTimeMin)}–{formatSeconds(context.targetBrewTimeMax)}</p>
        </>
      ) : null}

      {feedback ? (
        <>
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">Feedback saved</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_FEEDBACK_CATALOG.filter(({ value }) => feedback[value]).map(({ label, value }) => (
                <span className="rounded-full bg-[var(--background)] px-3 py-2 text-sm font-semibold" key={value}>{label}</span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Saved feedback is a historical observation and cannot be edited.</p>
          </div>
          <AdjustmentFlow action={adjustmentAction} inferredDirections={inferredDirections} />
        </>
      ) : (
        <>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-[var(--muted)]">
            Choose what stood out. Add sensory details only if they are useful right now.
          </p>
          <TasteFeedbackForm action={feedbackAction} cancelHref={`/brew/${brewPlanId}`} />
        </>
      )}
    </section>
  );
}
