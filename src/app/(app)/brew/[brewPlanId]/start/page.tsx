import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/require-user";
import { getBrewPlan } from "@/features/brew-plan/repository";

type StartBrewPlaceholderPageProps = { params: Promise<{ brewPlanId: string }> };

export default async function StartBrewPlaceholderPage({ params }: StartBrewPlaceholderPageProps) {
  const { brewPlanId } = await params;
  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();

  return (
    <section aria-labelledby="guided-brew-placeholder-heading" className="mx-auto max-w-lg py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Milestone 5</p>
      <h1 id="guided-brew-placeholder-heading" className="mt-4 text-3xl font-semibold tracking-tight">Guided Brew comes next</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
        Your Brew Plan is saved. No Brew Session or timer has been created.
      </p>
      <Link className="mt-8 inline-flex min-h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold" href={`/brew/${plan.id}`}>Back to Brew Plan</Link>
    </section>
  );
}
