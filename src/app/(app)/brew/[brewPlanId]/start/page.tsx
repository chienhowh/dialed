import { notFound } from "next/navigation";

import { GuidedBrew } from "@/components/brew/guided-brew";
import { requireUser } from "@/features/auth/require-user";
import { getBrewPlan } from "@/features/brew-plan/repository";
import { createGuidedBrewPlanSnapshot } from "@/features/brew-session/plan";

type StartBrewPageProps = { params: Promise<{ brewPlanId: string }> };

export default async function StartBrewPage({ params }: StartBrewPageProps) {
  const { brewPlanId } = await params;
  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();

  return <GuidedBrew plan={createGuidedBrewPlanSnapshot(plan)} />;
}
