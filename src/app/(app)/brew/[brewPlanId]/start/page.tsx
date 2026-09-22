import { notFound } from "next/navigation";

import { GuidedBrew } from "@/components/brew/guided-brew";
import { requireUser } from "@/features/auth/require-user";
import { getBrewPlan } from "@/features/brew-plan/repository";
import { createGuidedBrewPlanSnapshot } from "@/features/brew-session/plan";
import { InvalidGuidedBrewPlanError } from "@/features/brew-session/presentation";

type StartBrewPageProps = { params: Promise<{ brewPlanId: string }> };

export default async function StartBrewPage({ params }: StartBrewPageProps) {
  const { brewPlanId } = await params;
  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();

  let snapshot;
  try {
    snapshot = createGuidedBrewPlanSnapshot(plan);
  } catch (error) {
    if (error instanceof InvalidGuidedBrewPlanError) notFound();
    throw error;
  }
  return <GuidedBrew ownerUserId={user.id} plan={snapshot} />;
}
