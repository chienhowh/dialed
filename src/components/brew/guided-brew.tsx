"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatAmount, formatSeconds } from "@/features/brew-plan/display";
import {
  abortActiveBrew,
  advanceActiveBrew,
  clearActiveBrew,
  completeActiveBrew,
  createActiveBrewRecord,
  readActiveBrew,
  saveActiveBrew,
  toBrewSessionSyncInput,
} from "@/features/brew-session/active-brew";
import { syncBrewSessionAction } from "@/features/brew-session/actions";
import { getElapsedSeconds } from "@/features/brew-session/timer";
import type { ActiveBrewRecord, GuidedBrewPlanSnapshot } from "@/features/brew-session/types";

function completionPath(record: ActiveBrewRecord) {
  return `/brew/${record.plan.brewPlanId}/session/${record.sessionId}/feedback`;
}

function GuidedHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border)] px-5">
      <p className="text-sm font-semibold tracking-tight">Guided Brew</p>
      {children}
    </header>
  );
}

export function GuidedBrew({ plan }: { plan: GuidedBrewPlanSnapshot }) {
  const router = useRouter();
  const [record, setRecord] = useState<ActiveBrewRecord | null>(null);
  const [foreignRecord, setForeignRecord] = useState<ActiveBrewRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const syncingTerminalRef = useRef<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());

  const syncRecord = useCallback(async (nextRecord: ActiveBrewRecord) => {
    if (nextRecord.status !== "active" && syncingTerminalRef.current === nextRecord.sessionId) return;
    if (nextRecord.status !== "active") syncingTerminalRef.current = nextRecord.sessionId;

    let result;
    try {
      result = await syncBrewSessionAction(toBrewSessionSyncInput(nextRecord));
    } catch {
      setSyncMessage("This brew is saved on this device and will sync when the connection returns.");
      syncingTerminalRef.current = null;
      return;
    }

    if (!result.success) {
      setSyncMessage(result.message);
      syncingTerminalRef.current = null;
      return;
    }

    setSyncMessage(null);
    if (result.status === "completed" || result.status === "aborted") {
      clearActiveBrew(window.localStorage, nextRecord.sessionId);
      if (result.status === "completed") {
        router.replace(completionPath(nextRecord));
      } else {
        router.replace(`/brew/${nextRecord.plan.brewPlanId}`);
      }
    }
  }, [router]);

  const queueSync = useCallback((nextRecord: ActiveBrewRecord) => {
    syncQueueRef.current = syncQueueRef.current.then(
      () => syncRecord(nextRecord),
      () => syncRecord(nextRecord),
    );
  }, [syncRecord]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const stored = readActiveBrew(window.localStorage);
      if (stored?.plan.brewPlanId === plan.brewPlanId) {
        setRecord(stored);
        queueSync(stored);
      } else if (stored) {
        setForeignRecord(stored);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [plan.brewPlanId, queueSync]);

  useEffect(() => {
    if (!record || record.status !== "active") return;

    const initialTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, [record]);

  useEffect(() => {
    const handleOnline = () => {
      const stored = readActiveBrew(window.localStorage);
      if (stored) queueSync(stored);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [queueSync]);

  function store(nextRecord: ActiveBrewRecord) {
    try {
      saveActiveBrew(window.localStorage, nextRecord);
      setRecord(nextRecord);
      setStorageMessage(null);
      return true;
    } catch {
      setStorageMessage("This device could not save the brew. Free some browser storage, then try again.");
      return false;
    }
  }

  function start() {
    try {
      const stored = readActiveBrew(window.localStorage);
      if (stored) {
        if (stored.plan.brewPlanId === plan.brewPlanId) {
          setRecord(stored);
          queueSync(stored);
        } else {
          setForeignRecord(stored);
        }
        return;
      }

      const nextRecord = createActiveBrewRecord(plan, crypto.randomUUID(), Date.now());
      if (store(nextRecord)) queueSync(nextRecord);
    } catch {
      setStorageMessage("This device could not save the brew. Free some browser storage, then try again.");
    }
  }

  function advance() {
    if (!record) return;
    const nextRecord = advanceActiveBrew(record, Date.now());
    if (store(nextRecord)) queueSync(nextRecord);
  }

  function finish() {
    if (!record) return;
    const nextRecord = completeActiveBrew(record, Date.now());
    if (store(nextRecord)) queueSync(nextRecord);
  }

  function abort() {
    if (!record || !window.confirm("Stop this brew? The incomplete session will be saved as aborted.")) return;
    const nextRecord = abortActiveBrew(record, Date.now());
    if (store(nextRecord)) queueSync(nextRecord);
  }

  if (!hydrated) {
    return (
      <section className="fixed inset-0 z-50 grid place-items-center bg-[var(--background)] px-5" aria-live="polite">
        <p className="text-sm text-[var(--muted)]">Restoring brew…</p>
      </section>
    );
  }

  if (foreignRecord) {
    const isActive = foreignRecord.status === "active";
    return (
      <section className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
          <GuidedHeader>
            <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href={`/brew/${plan.brewPlanId}`}>Close</Link>
          </GuidedHeader>
          <div className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brew in progress</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Finish your current brew first</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
              {isActive
                ? `${foreignRecord.plan.coffeeName} is still brewing on this device.`
                : `${foreignRecord.plan.coffeeName} is saved on this device and still needs to sync.`}
            </p>
            <Link className="mt-8 flex min-h-14 items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href={`/brew/${foreignRecord.plan.brewPlanId}/start`}>
              {isActive ? "Resume Brew" : "Resume Sync"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
          <GuidedHeader>
            <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href={`/brew/${plan.brewPlanId}`}>Close</Link>
          </GuidedHeader>
          <div className="flex flex-1 flex-col px-5 py-8">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Ready to brew</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{plan.coffeeName}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">For {plan.tasteGoal}</p>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
                <dd className="text-xl font-semibold">{formatAmount(plan.coffeeDose)}g</dd>
                <dt className="mt-1 text-xs text-[var(--muted)]">Coffee</dt>
              </div>
              <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
                <dd className="text-xl font-semibold">{formatAmount(plan.waterAmount)}g</dd>
                <dt className="mt-1 text-xs text-[var(--muted)]">Water</dt>
              </div>
              <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
                <dd className="text-xl font-semibold">{plan.waterTemperature}°C</dd>
                <dt className="mt-1 text-xs text-[var(--muted)]">Temperature</dt>
              </div>
            </dl>

            <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Recipe</p>
              <p className="mt-2 text-xl font-semibold">{plan.recipeName}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{plan.grindLevel} · 1:{formatAmount(plan.ratio)} · {formatSeconds(plan.targetBrewTimeMin)}–{formatSeconds(plan.targetBrewTimeMax)}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">The timer and Brew Session begin only when you tap Start.</p>
            </div>

            <div className="mt-auto pt-8">
              {storageMessage ? <p className="mb-3 text-sm text-red-700" role="alert">{storageMessage}</p> : null}
              <button className="min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-semibold text-white" onClick={start} type="button">Start</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (record.status !== "active") {
    return (
      <section className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[var(--background)] px-5 text-center">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Saved on this device</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Finishing your brew…</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{syncMessage ?? "Syncing the completed Brew Session."}</p>
          <button className="mt-8 min-h-14 w-full rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" onClick={() => queueSync(record)} type="button">Retry Sync</button>
        </div>
      </section>
    );
  }

  const currentStep = record.plan.steps[record.currentStepIndex];
  const elapsed = getElapsedSeconds(record.startedAt, now);
  const isLastStep = record.currentStepIndex === record.plan.steps.length - 1;
  const nextStep = record.plan.steps[record.currentStepIndex + 1];

  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <GuidedHeader>
          <button className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" onClick={abort} type="button">Stop</button>
        </GuidedHeader>

        <div className="flex flex-1 flex-col px-5 py-7 text-center">
          <div aria-live="off">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Elapsed</p>
            <time className="mt-1 block font-mono text-6xl font-semibold tracking-tight tabular-nums" dateTime={`PT${elapsed}S`}>{formatSeconds(elapsed)}</time>
          </div>

          <div className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Step {record.currentStepIndex + 1} of {record.plan.steps.length}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{currentStep.note ?? (currentStep.stepType === "pour" ? "Pour" : "Wait")}</h1>
            {currentStep.stepType === "pour" && currentStep.targetWater !== null ? (
              <p className="mt-5 text-lg text-[var(--muted)]">Pour to <strong className="block text-5xl text-[var(--accent)]">{formatAmount(currentStep.targetWater)}g</strong></p>
            ) : (
              <p className="mt-5 text-2xl font-semibold text-[var(--accent)]">{currentStep.duration === null ? "Wait" : `Wait ${formatSeconds(currentStep.duration)}`}</p>
            )}
            {!isLastStep && nextStep ? (
              <p className="mt-6 text-sm text-[var(--muted)]">Next at about {formatSeconds(nextStep.startTime)} · {nextStep.note ?? (nextStep.stepType === "pour" ? "Pour" : "Wait")}</p>
            ) : (
              <p className="mt-6 text-sm text-[var(--muted)]">Finish when the brew has drawn down.</p>
            )}
          </div>

          <div className="mt-6 flex gap-2" aria-label="Brew progress">
            {record.plan.steps.map((step, index) => (
              <span className={`h-1.5 flex-1 rounded-full ${index <= record.currentStepIndex ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} key={step.id} />
            ))}
          </div>

          <div className="mt-auto pt-8">
            {syncMessage ? <p className="mb-3 text-sm text-[var(--muted)]" role="status">Offline — progress is saved on this device.</p> : null}
            {storageMessage ? <p className="mb-3 text-sm text-red-700" role="alert">{storageMessage}</p> : null}
            <button className="min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-semibold text-white" onClick={isLastStep ? finish : advance} type="button">
              {isLastStep ? "Finish Brew" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
