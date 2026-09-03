import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrewPlanEditForm } from "@/components/brew/brew-plan-edit-form";
import { requireUser } from "@/features/auth/require-user";
import { updateBrewPlanAction } from "@/features/brew-plan/actions";
import { getBrewPlan } from "@/features/brew-plan/repository";

type EditBrewPlanPageProps = { params: Promise<{ brewPlanId: string }> };

export default async function EditBrewPlanPage({ params }: EditBrewPlanPageProps) {
  const { brewPlanId } = await params;
  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();
  if (plan.hasStartedBrew) redirect(`/brew/${plan.id}`);
  const action = updateBrewPlanAction.bind(null, plan.id);

  return (
    <section aria-labelledby="edit-brew-plan-heading" className="mx-auto max-w-lg">
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href={`/brew/${plan.id}`}>← Brew Plan</Link>
      <h1 id="edit-brew-plan-heading" className="mt-5 text-3xl font-semibold tracking-tight">Edit Plan</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Fine-tune this one plan before brewing.</p>
      <BrewPlanEditForm action={action} plan={plan} />
    </section>
  );
}
