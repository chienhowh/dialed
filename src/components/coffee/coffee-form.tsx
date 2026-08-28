"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PROCESS_CATALOG, ROAST_LEVEL_CATALOG } from "@/domain/coffee/bean-profile";
import {
  initialCoffeeFormState,
  type CoffeeFormState,
  type CoffeeFormValues,
} from "@/features/coffee/coffee-form";

import { OriginCombobox } from "./origin-combobox";

type CoffeeFormProps = {
  action: (state: CoffeeFormState, formData: FormData) => Promise<CoffeeFormState>;
  cancelHref: string;
  defaultValues: CoffeeFormValues;
  submitLabel: string;
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:border-[var(--accent)]";

function FieldError({ error }: { error?: string }) {
  return error ? (
    <p className="mt-2 text-sm text-red-700" role="alert">
      {error}
    </p>
  ) : null;
}

export function CoffeeForm({ action, cancelHref, defaultValues, submitLabel }: CoffeeFormProps) {
  const [state, formAction, pending] = useActionState(action, initialCoffeeFormState);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {state.message ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <div>
        <label className="text-sm font-medium" htmlFor="originCountry">
          Origin <span aria-hidden="true">*</span>
        </label>
        <OriginCombobox defaultValue={defaultValues.originCountry} inputClassName={inputClassName} />
        <FieldError error={state.errors?.originCountry} />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="region">Region</label>
        <input className={inputClassName} defaultValue={defaultValues.region} id="region" maxLength={120} name="region" />
        <FieldError error={state.errors?.region} />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="process">
          Process <span aria-hidden="true">*</span>
        </label>
        <select className={inputClassName} defaultValue={defaultValues.process} id="process" name="process" required>
          <option value="">Select process</option>
          {PROCESS_CATALOG.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <FieldError error={state.errors?.process} />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="roastLevel">
          Roast Level <span aria-hidden="true">*</span>
        </label>
        <select className={inputClassName} defaultValue={defaultValues.roastLevel} id="roastLevel" name="roastLevel" required>
          <option value="">Select roast level</option>
          {ROAST_LEVEL_CATALOG.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <FieldError error={state.errors?.roastLevel} />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="variety">Variety</label>
        <input className={inputClassName} defaultValue={defaultValues.variety} id="variety" maxLength={160} name="variety" />
        <FieldError error={state.errors?.variety} />
      </div>

      <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <summary className="cursor-pointer font-semibold">More details</summary>
        <div className="mt-6 space-y-6">
          <div>
            <label className="text-sm font-medium" htmlFor="roaster">Roaster</label>
            <input className={inputClassName} defaultValue={defaultValues.roaster} id="roaster" maxLength={160} name="roaster" />
            <FieldError error={state.errors?.roaster} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="productName">Coffee Name</label>
            <input className={inputClassName} defaultValue={defaultValues.productName} id="productName" maxLength={160} name="productName" />
            <FieldError error={state.errors?.productName} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="producer">Producer</label>
            <input className={inputClassName} defaultValue={defaultValues.producer} id="producer" maxLength={160} name="producer" />
            <FieldError error={state.errors?.producer} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="farm">Farm</label>
            <input className={inputClassName} defaultValue={defaultValues.farm} id="farm" maxLength={160} name="farm" />
            <FieldError error={state.errors?.farm} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="roastDate">Roast Date</label>
            <input className={inputClassName} defaultValue={defaultValues.roastDate} id="roastDate" name="roastDate" type="date" />
            <FieldError error={state.errors?.roastDate} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="purchaseDate">Purchase Date</label>
            <input className={inputClassName} defaultValue={defaultValues.purchaseDate} id="purchaseDate" name="purchaseDate" type="date" />
            <FieldError error={state.errors?.purchaseDate} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="purchasePlace">Purchase Place</label>
            <input className={inputClassName} defaultValue={defaultValues.purchasePlace} id="purchasePlace" maxLength={160} name="purchasePlace" />
            <FieldError error={state.errors?.purchasePlace} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="notes">Notes</label>
            <textarea className={`${inputClassName} min-h-28 py-3`} defaultValue={defaultValues.notes} id="notes" maxLength={4000} name="notes" />
            <FieldError error={state.errors?.notes} />
          </div>
        </div>
      </details>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold" href={cancelHref}>
          Cancel
        </Link>
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
