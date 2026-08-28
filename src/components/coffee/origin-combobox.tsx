"use client";

import { useId, useMemo, useState } from "react";

import {
  getOriginLabel,
  ORIGIN_CATALOG,
  type OriginCode,
} from "@/domain/coffee/bean-profile";

type OriginComboboxProps = {
  defaultValue: OriginCode | "";
  inputClassName: string;
};

const MAX_VISIBLE_OPTIONS = 8;

export function OriginCombobox({ defaultValue, inputClassName }: OriginComboboxProps) {
  const listboxId = useId();
  const [selectedCode, setSelectedCode] = useState<OriginCode | "">(defaultValue);
  const [query, setQuery] = useState(defaultValue ? getOriginLabel(defaultValue) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("en");

    return ORIGIN_CATALOG.filter(({ code, label }) => {
      return !search || code.toLocaleLowerCase("en").includes(search) || label.toLocaleLowerCase("en").includes(search);
    }).slice(0, MAX_VISIBLE_OPTIONS);
  }, [query]);

  const selectOption = (code: OriginCode) => {
    setSelectedCode(code);
    setQuery(getOriginLabel(code));
    setIsOpen(false);
    setActiveIndex(0);
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(selectedCode ? getOriginLabel(selectedCode) : "");
        }
      }}
    >
      <input name="originCountry" type="hidden" value={selectedCode} />
      <input
        aria-activedescendant={isOpen && options[activeIndex] ? `${listboxId}-${options[activeIndex].code}` : undefined}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-required="true"
        autoComplete="off"
        className={inputClassName}
        id="originCountry"
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedCode("");
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && isOpen && options[activeIndex]) {
            event.preventDefault();
            selectOption(options[activeIndex].code);
          } else if (event.key === "Escape") {
            setIsOpen(false);
            setQuery(selectedCode ? getOriginLabel(selectedCode) : "");
          }
        }}
        placeholder="Search by country name or code"
        role="combobox"
        value={query}
      />

      {isOpen ? (
        <div
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
          id={listboxId}
          role="listbox"
        >
          {options.length > 0 ? (
            options.map(({ code, label }, index) => (
              <button
                aria-selected={code === selectedCode}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${index === activeIndex ? "bg-[var(--background)]" : ""}`}
                id={`${listboxId}-${code}`}
                key={code}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(code)}
                role="option"
                type="button"
              >
                <span>{label}</span>
                <span className="text-xs font-semibold text-[var(--muted)]">{code}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-[var(--muted)]">No matching country</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
