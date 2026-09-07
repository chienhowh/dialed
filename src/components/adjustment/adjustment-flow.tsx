"use client";

import { useActionState, useMemo, useState } from "react";

import {
  ADJUSTMENT_DIRECTION_PRESENTATION,
  getCandidatesForDirection,
  getRecommendedCandidate,
} from "@/features/adjustment/config";
import {
  initialAdjustmentFormState,
  type AdjustmentFormState,
} from "@/features/adjustment/form";
import type { AdjustmentDirection } from "@/features/adjustment/types";

type AdjustmentFlowProps = {
  action: (state: AdjustmentFormState, formData: FormData) => Promise<AdjustmentFormState>;
  inferredDirections: AdjustmentDirection[];
};

export function AdjustmentFlow({ action, inferredDirections }: AdjustmentFlowProps) {
  const [state, formAction, pending] = useActionState(action, initialAdjustmentFormState);
  const needsDirectionChoice = inferredDirections.length > 1;
  const [step, setStep] = useState<"candidate" | "direction">(needsDirectionChoice ? "direction" : "candidate");
  const [selectedDirection, setSelectedDirection] = useState<AdjustmentDirection | "">(
    needsDirectionChoice ? "" : (inferredDirections[0] ?? ""),
  );
  const candidates = useMemo(
    () => selectedDirection ? getCandidatesForDirection(selectedDirection) : [],
    [selectedDirection],
  );
  const recommended = selectedDirection ? getRecommendedCandidate(selectedDirection) : null;
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const activeCandidateId = selectedCandidateId || recommended?.id || "";

  if (step === "direction") {
    return (
      <section className="mt-8 text-left" aria-labelledby="direction-heading">
        <h2 className="text-2xl font-semibold tracking-tight" id="direction-heading">What should we improve first?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">These are possible directions, not diagnoses. Choose one priority for the next experiment.</p>
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Adjustment direction</legend>
          {inferredDirections.map((direction) => {
            const presentation = ADJUSTMENT_DIRECTION_PRESENTATION[direction];
            return (
              <label className="block cursor-pointer" key={direction}>
                <input className="peer sr-only" checked={selectedDirection === direction} name="directionChoice" onChange={() => setSelectedDirection(direction)} type="radio" />
                <span className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 peer-checked:border-[var(--accent)] peer-checked:ring-1 peer-checked:ring-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                  <span className="font-semibold">{presentation.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{presentation.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <button
          className="mt-8 min-h-12 w-full rounded-xl bg-[var(--accent)] px-5 font-semibold text-white disabled:opacity-50"
          disabled={!selectedDirection}
          onClick={() => {
            setSelectedCandidateId("");
            setStep("candidate");
          }}
          type="button"
        >
          Continue
        </button>
      </section>
    );
  }

  if (!selectedDirection) return null;
  const directionPresentation = ADJUSTMENT_DIRECTION_PRESENTATION[selectedDirection];

  return (
    <form action={formAction} className="mt-8 text-left">
      <input name="selectedDirection" type="hidden" value={selectedDirection} />
      {activeCandidateId ? <input name="selectedCandidateId" type="hidden" value={activeCandidateId} /> : null}
      {state.message ? <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{state.message}</p> : null}

      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Selected direction</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{directionPresentation.label}</h2>

      {selectedDirection === "hold" ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-xl font-semibold">Keep this brew unchanged</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Save the intentional hold for this completed cup.</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-xl font-semibold">No reviewed adjustment yet</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">We know what you want to improve, but Dialed does not yet have a reviewed one-variable adjustment for this direction.</p>
        </div>
      ) : (
        <fieldset className="mt-6">
          <legend className="text-xl font-semibold">Try this next</legend>
          <div className="mt-4 space-y-3">
            {candidates.map((candidate, index) => (
              <label className="block cursor-pointer" key={candidate.id}>
                <input
                  checked={activeCandidateId === candidate.id}
                  className="peer sr-only"
                  name="candidateChoice"
                  onChange={() => setSelectedCandidateId(candidate.id)}
                  type="radio"
                />
                <span className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 peer-checked:border-[var(--accent)] peer-checked:ring-1 peer-checked:ring-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                  <span className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">{index === 0 ? "★ Recommended" : "Other option"}</span>
                  <span className="mt-2 block font-semibold">{candidate.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{candidate.reason}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={`mt-8 grid gap-3 ${needsDirectionChoice ? "grid-cols-2" : ""}`}>
        {needsDirectionChoice ? (
          <button className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold" onClick={() => setStep("direction")} type="button">Back</button>
        ) : null}
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : selectedDirection === "hold" ? "Save hold" : candidates.length === 0 ? "Save direction" : "Save adjustment"}
        </button>
      </div>
    </form>
  );
}
