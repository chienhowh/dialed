import Link from "next/link";

import {
  ADJUSTMENT_DIRECTION_PRESENTATION,
  getCandidateSnapshotLabel,
} from "@/features/adjustment/config";
import type { AdjustmentDecision } from "@/features/adjustment/types";

export function AdjustmentResult({ coffeeId, decision }: { coffeeId: string; decision: AdjustmentDecision }) {
  let title = "Adjustment saved";
  let body: React.ReactNode;

  if (decision.status === "held") {
    title = "Dialed in";
    body = <p className="mt-4 text-base text-[var(--muted)]">Keep this brew unchanged.</p>;
  } else if (decision.status === "unsupported") {
    title = "Direction saved";
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
        <p className="mt-1 text-xl font-semibold">{decision.selectedCandidate ? getCandidateSnapshotLabel(decision.selectedCandidate) : "Saved adjustment"}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Only this primary variable will change.</p>
      </>
    );
  }

  return (
    <section aria-labelledby="adjustment-result-heading" className="mx-auto max-w-lg py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brew complete</p>
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h1 className="text-3xl font-semibold tracking-tight" id="adjustment-result-heading">{title}</h1>
        {body}
      </div>
      <Link className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href={`/coffee/${coffeeId}`}>Done</Link>
    </section>
  );
}
