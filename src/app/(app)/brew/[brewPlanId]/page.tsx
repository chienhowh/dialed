import { notFound } from "next/navigation";

import { BrewPlanSummary } from "@/components/brew/brew-plan-summary";
import { requireUser } from "@/features/auth/require-user";
import { getBrewPlan } from "@/features/brew-plan/repository";

type BrewPlanPageProps = { params: Promise<{ brewPlanId: string }> };

export default async function BrewPlanPage({ params }: BrewPlanPageProps) {
  const { brewPlanId } = await params;
  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();

  return <BrewPlanSummary plan={plan} />;
}
