import {
  isOriginCode,
  isProcessCode,
  isRoastLevelCode,
  type OriginCode,
  type ProcessCode,
  type RoastLevelCode,
} from "@/domain/coffee/bean-profile";

import type { Coffee, CoffeeInput } from "./types";

export type CoffeeFormValues = {
  farm: string;
  notes: string;
  originCountry: OriginCode | "";
  process: ProcessCode | "";
  producer: string;
  productName: string;
  purchaseDate: string;
  purchasePlace: string;
  region: string;
  roastDate: string;
  roastLevel: RoastLevelCode | "";
  roaster: string;
  variety: string;
};

export type CoffeeFormState = {
  errors?: Partial<Record<keyof CoffeeFormValues, string>>;
  message?: string;
};

export const initialCoffeeFormState: CoffeeFormState = {};

export const emptyCoffeeFormValues: CoffeeFormValues = {
  farm: "",
  notes: "",
  originCountry: "",
  process: "",
  producer: "",
  productName: "",
  purchaseDate: "",
  purchasePlace: "",
  region: "",
  roastDate: "",
  roastLevel: "",
  roaster: "",
  variety: "",
};

export function coffeeToFormValues(coffee: Coffee): CoffeeFormValues {
  return {
    farm: coffee.beanProfile.farm ?? "",
    notes: coffee.notes ?? "",
    originCountry: coffee.beanProfile.originCountry,
    process: coffee.beanProfile.process,
    producer: coffee.beanProfile.producer ?? "",
    productName: coffee.productName ?? "",
    purchaseDate: coffee.purchaseDate ?? "",
    purchasePlace: coffee.purchasePlace ?? "",
    region: coffee.beanProfile.region ?? "",
    roastDate: coffee.roastDate ?? "",
    roastLevel: coffee.beanProfile.roastLevel,
    roaster: coffee.roaster ?? "",
    variety: coffee.beanProfile.variety ?? "",
  };
}

const FIELD_LIMITS = {
  farm: 160,
  notes: 4000,
  producer: 160,
  productName: 160,
  purchasePlace: 160,
  region: 120,
  roaster: 160,
  variety: 160,
} as const;

function readValue(formData: FormData, field: keyof CoffeeFormValues) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function getCoffeeFormValues(formData: FormData) {
  return {
    farm: readValue(formData, "farm"),
    notes: readValue(formData, "notes"),
    originCountry: readValue(formData, "originCountry"),
    process: readValue(formData, "process"),
    producer: readValue(formData, "producer"),
    productName: readValue(formData, "productName"),
    purchaseDate: readValue(formData, "purchaseDate"),
    purchasePlace: readValue(formData, "purchasePlace"),
    region: readValue(formData, "region"),
    roastDate: readValue(formData, "roastDate"),
    roastLevel: readValue(formData, "roastLevel"),
    roaster: readValue(formData, "roaster"),
    variety: readValue(formData, "variety"),
  };
}

export function parseCoffeeFormData(formData: FormData):
  | { data: CoffeeInput; success: true }
  | { errors: CoffeeFormState["errors"]; success: false } {
  const values = getCoffeeFormValues(formData);
  const errors: NonNullable<CoffeeFormState["errors"]> = {};
  const originCountry = isOriginCode(values.originCountry) ? values.originCountry : null;
  const process = isProcessCode(values.process) ? values.process : null;
  const roastLevel = isRoastLevelCode(values.roastLevel) ? values.roastLevel : null;

  for (const field of ["originCountry", "process", "roastLevel"] as const) {
    if (!values[field]) {
      errors[field] = "This field is required.";
    }
  }

  if (values.originCountry && !originCountry) {
    errors.originCountry = "Select a country from the list.";
  }

  if (values.process && !process) {
    errors.process = "Select a valid process.";
  }

  if (values.roastLevel && !roastLevel) {
    errors.roastLevel = "Select a valid roast level.";
  }

  for (const [field, limit] of Object.entries(FIELD_LIMITS) as [keyof typeof FIELD_LIMITS, number][]) {
    if (values[field].length > limit) {
      errors[field] = `Use ${limit} characters or fewer.`;
    }
  }

  for (const field of ["roastDate", "purchaseDate"] as const) {
    if (values[field] && !isValidDate(values[field])) {
      errors[field] = "Enter a valid date.";
    }
  }

  if (Object.keys(errors).length > 0 || !originCountry || !process || !roastLevel) {
    return { errors, success: false };
  }

  const optional = (value: string) => value || null;

  return {
    data: {
      farm: optional(values.farm),
      notes: optional(values.notes),
      originCountry,
      process,
      producer: optional(values.producer),
      productName: optional(values.productName),
      purchaseDate: optional(values.purchaseDate),
      purchasePlace: optional(values.purchasePlace),
      region: optional(values.region),
      roastDate: optional(values.roastDate),
      roastLevel,
      roaster: optional(values.roaster),
      variety: optional(values.variety),
    },
    success: true,
  };
}
