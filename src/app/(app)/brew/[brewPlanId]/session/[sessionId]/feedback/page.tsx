import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatSeconds } from "@/features/brew-plan/display";
import { requireUser } from "@/features/auth/require-user";
import { getBrewSession } from "@/features/brew-session/repository";

type FeedbackPlaceholderPageProps = {
  params: Promise<{ brewPlanId: string; sessionId: string }>;
};

export default async function FeedbackPlaceholderPage({ params }: FeedbackPlaceholderPageProps) {
  const { brewPlanId, sessionId } = await params;
  const { supabase, user } = await requireUser();
  const session = await getBrewSession(supabase, user.id, sessionId);
  if (!session || session.brewPlanId !== brewPlanId) notFound();
  if (session.status === "brewing") redirect(`/brew/${brewPlanId}/start`);
  if (session.status !== "completed" || session.actualBrewTime === null) notFound();

  return (
    <section aria-labelledby="brew-complete-heading" className="mx-auto max-w-lg py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brew complete</p>
      <h1 id="brew-complete-heading" className="mt-4 text-3xl font-semibold tracking-tight">Nice work.</h1>
      <p className="mt-5 text-sm text-[var(--muted)]">Actual brew time</p>
      <p className="mt-1 font-mono text-5xl font-semibold tabular-nums">{formatSeconds(session.actualBrewTime)}</p>

      <div className="mt-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Milestone 6</p>
        <h2 className="mt-3 text-xl font-semibold">Taste feedback comes next</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This completed Brew Session is saved. No Taste Feedback or Adjustment has been created.</p>
      </div>

      <Link className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold" href={`/brew/${brewPlanId}`}>Back to Brew Plan</Link>
    </section>
  );
}
