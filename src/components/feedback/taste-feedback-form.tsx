"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  FLAVOR_TAG_CATALOG,
  QUICK_FEEDBACK_CATALOG,
  SENSORY_RATING_CATALOG,
  type QuickFeedback,
} from "@/domain/taste/feedback";
import {
  initialFeedbackFormState,
  type FeedbackFormState,
} from "@/features/feedback/form";

type TasteFeedbackFormProps = {
  action: (state: FeedbackFormState, formData: FormData) => Promise<FeedbackFormState>;
  cancelHref: string;
};

const inputClassName = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:border-[var(--accent)]";

function RatingSelect({ defaultValue, label, name }: { defaultValue?: string; label: string; name: string }) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={name}>{label}</label>
      <select className={inputClassName} defaultValue={defaultValue ?? ""} id={name} name={name}>
        <option value="">Not rated</option>
        {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
      </select>
    </div>
  );
}

export function TasteFeedbackForm({ action, cancelHref }: TasteFeedbackFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFeedbackFormState);
  const [quickFeedback, setQuickFeedback] = useState<QuickFeedback[]>(state.values?.quickFeedback ?? []);

  function toggleQuickFeedback(value: QuickFeedback) {
    setQuickFeedback((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (value === "pretty_good") return [value];
      return [...current.filter((item) => item !== "pretty_good"), value];
    });
  }

  return (
    <form action={formAction} aria-label="Quick taste feedback" className="mt-8 text-left">
      {state.message ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <fieldset className="mt-6" aria-describedby={state.errors?.quickFeedback ? "quick-feedback-error" : undefined}>
        <legend className="font-semibold">What did you notice? <span aria-hidden="true">*</span></legend>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {QUICK_FEEDBACK_CATALOG.map(({ label, value }) => {
            const isPrettyGood = value === "pretty_good";
            return (
              <label className={`cursor-pointer ${isPrettyGood ? "col-span-2" : ""}`} key={value}>
                <input
                  checked={quickFeedback.includes(value)}
                  className="peer sr-only"
                  name="quickFeedback"
                  onChange={() => toggleQuickFeedback(value)}
                  type="checkbox"
                  value={value}
                />
                <span className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        {state.errors?.quickFeedback ? <p className="mt-3 text-sm text-red-700" id="quick-feedback-error" role="alert">{state.errors.quickFeedback}</p> : null}
      </fieldset>

      <div className="mt-8">
        <RatingSelect defaultValue={state.values?.overallRating} label="Overall rating (optional)" name="overallRating" />
        {state.errors?.overallRating ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors.overallRating}</p> : null}
      </div>

      <details className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <summary className="cursor-pointer font-semibold">Add sensory details</summary>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {SENSORY_RATING_CATALOG.map(({ label, value }) => (
            <div key={value}>
              <RatingSelect defaultValue={state.values?.[value]} label={label} name={value} />
              {state.errors?.[value] ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors[value]}</p> : null}
            </div>
          ))}
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-medium">Flavor notes</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLAVOR_TAG_CATALOG.map((tag) => (
              <label className="cursor-pointer" key={tag}>
                <input className="peer sr-only" defaultChecked={state.values?.flavorTags.includes(tag)} name="flavorTags" type="checkbox" value={tag} />
                <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] px-3 text-sm peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">{tag}</span>
              </label>
            ))}
          </div>
          {state.errors?.flavorTags ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors.flavorTags}</p> : null}
        </fieldset>

        <div className="mt-6">
          <label className="text-sm font-medium" htmlFor="customTags">Other flavor tags</label>
          <input className={inputClassName} defaultValue={state.values?.customTags} id="customTags" name="customTags" placeholder="e.g. Jasmine, Peach" />
          <p className="mt-2 text-xs text-[var(--muted)]">Separate tags with commas.</p>
          {state.errors?.customTags ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors.customTags}</p> : null}
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium" htmlFor="notes">Notes</label>
          <textarea className={`${inputClassName} min-h-28 py-3`} defaultValue={state.values?.notes} id="notes" maxLength={4000} name="notes" />
          {state.errors?.notes ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors.notes}</p> : null}
        </div>
      </details>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold" href={cancelHref}>Back</Link>
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save feedback"}
        </button>
      </div>
    </form>
  );
}
