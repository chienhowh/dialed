"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import {
  abortActiveBrew,
  clearActiveBrew,
  readActiveBrew,
  saveActiveBrew,
  toBrewSessionSyncInput,
} from "@/features/brew-session/active-brew";
import { syncBrewSessionAction } from "@/features/brew-session/actions";
import type { ActiveBrewRecord } from "@/features/brew-session/types";

function destination(record: ActiveBrewRecord, status: "aborted" | "completed") {
  return status === "completed"
    ? `/brew/${record.plan.brewPlanId}/session/${record.sessionId}/feedback`
    : `/brew/${record.plan.brewPlanId}`;
}

export function ActiveBrewRecovery({ ownerUserId }: { ownerUserId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<ActiveBrewRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const attemptedSessionRef = useRef<string | null>(null);

  const sync = useCallback(async (stored: ActiveBrewRecord) => {
    setSyncing(true);
    let result;
    try {
      result = await syncBrewSessionAction(toBrewSessionSyncInput(stored));
    } catch {
      setSyncing(false);
      setRecord(stored);
      setMessage("This brew is saved on this device and will sync when the connection returns.");
      return;
    }
    setSyncing(false);

    if (!result.success) {
      if (result.reason === "unavailable") {
        clearActiveBrew(window.localStorage, ownerUserId, stored.sessionId);
        setRecord(null);
        setMessage("An unavailable device recovery was removed.");
      } else {
        setRecord(stored);
        setMessage(result.message);
      }
      return;
    }

    setMessage(null);
    if (result.status === "brewing") {
      setRecord(stored);
      return;
    }
    if (result.status === "completed" || result.status === "aborted") {
      clearActiveBrew(window.localStorage, ownerUserId, stored.sessionId);
      setRecord(null);
      router.replace(destination(stored, result.status));
      router.refresh();
    }
  }, [ownerUserId, router]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const stored = readActiveBrew(window.localStorage, ownerUserId);
      if (stored && attemptedSessionRef.current !== stored.sessionId) {
        attemptedSessionRef.current = stored.sessionId;
        startTransition(() => { void sync(stored); });
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [ownerUserId, sync]);

  async function endActiveBrew() {
    if (!record || record.status !== "active") return;
    if (!window.confirm("End this device recovery? The incomplete Brew Session will be saved as stopped.")) return;
    const aborted = abortActiveBrew(record, Date.now());
    saveActiveBrew(window.localStorage, aborted);
    setRecord(aborted);
    await sync(aborted);
  }

  if (!record && !message) return null;

  return (
    <aside aria-label="Device brew recovery" className="border-b border-[var(--border)] bg-amber-50 px-5 py-4 text-sm">
      {record ? (
        <div className="mx-auto max-w-lg">
          <p className="font-semibold">
            {record.status === "active" ? "Brew in progress on this device" : "Completed brew waiting to sync"}
          </p>
          <p className="mt-1 text-[var(--muted)]">{record.plan.coffeeName}</p>
          {message ? <p className="mt-2 text-[var(--muted)]" role="status">{message}</p> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            {record.status === "active" ? (
              <>
                <Link className="inline-flex min-h-11 items-center rounded-xl bg-[var(--accent)] px-4 font-semibold text-white" href={`/brew/${record.plan.brewPlanId}/start`}>
                  Resume Brew
                </Link>
                <button className="min-h-11 rounded-xl border border-[var(--border)] px-4 font-semibold" disabled={syncing} onClick={endActiveBrew} type="button">
                  End Brew
                </button>
              </>
            ) : (
              <button className="min-h-11 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60" disabled={syncing} onClick={() => void sync(record)} type="button">
                {syncing ? "Syncing…" : "Retry Sync"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="mx-auto max-w-lg text-[var(--muted)]" role="status">{message}</p>
      )}
    </aside>
  );
}
