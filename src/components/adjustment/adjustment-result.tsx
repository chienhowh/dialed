import Link from "next/link";

import { ContinueDialInForm } from "@/components/adjustment/continue-dial-in-form";
import {
  ADJUSTMENT_DIRECTION_PRESENTATION,
  getCandidateSnapshotLabel,
} from "@/features/adjustment/config";
import {
  getAdjustmentResultPresentation,
  type ContinueDialInState,
} from "@/features/adjustment/continue";
import type { AdjustmentDecision } from "@/features/adjustment/types";

type AdjustmentResultProps = {
  coffeeId: string;
  continueAction: (state: ContinueDialInState, formData: FormData) => Promise<ContinueDialInState>;
  decision: AdjustmentDecision;
};

export function AdjustmentResult({ coffeeId, continueAction, decision }: AdjustmentResultProps) {
  const candidateLabel = decision.selectedCandidate
    ? getCandidateSnapshotLabel(decision.selectedCandidate)
    : "Saved adjustment";
  const presentation = getAdjustmentResultPresentation(decision, candidateLabel);
  let body: React.ReactNode;

  if (presentation.action === "view_plan") {
    body = <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Your adjusted Brew Plan has already been created.</p>;
  } else if (decision.status === "held") {
    body = <p className="mt-4 text-base text-[var(--muted)]">Keep this brew unchanged.</p>;
  } else if (decision.status === "unsupported") {
    body = (
      <>
        <p className="mt-4 font-semibold">{ADJUSTMENT_DIRECTION_PRESENTATION[decision.selectedDirection].label}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Dialed does not yet have a reviewed one-variable adjustment for this direction.</p>
      </>
    );
  } else {
    body = (
      <>
        <p className="mt-4 text-sm text-[var(--muted)]">Next adjustment</p>
        <p className="mt-1 text-xl font-semibold">{candidateLabel}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Only this primary variable will change.</p>
      </>
    );
  }

  return (
    <section aria-labelledby="adjustment-result-heading" className="mx-auto max-w-lg py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brew complete</p>
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h1 className="text-3xl font-semibold tracking-tight" id="adjustment-result-heading">{presentation.title}</h1>
        {body}
      </div>
      {presentation.action === "continue" ? <ContinueDialInForm action={continueAction} /> : null}
      {presentation.action === "view_plan" ? (
        <Link className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href={`/brew/${presentation.brewPlanId}`}>View Brew Plan</Link>
      ) : null}
      <Link
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-semibold ${presentation.action === "done" ? "mt-8 bg-[var(--accent)] text-white" : "mt-3 border border-[var(--border)] bg-[var(--surface)]"}`}
        href={`/coffee/${coffeeId}`}
      >
        Done
      </Link>
    </section>
  );
}
