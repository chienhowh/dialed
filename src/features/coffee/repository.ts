import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isOriginCode,
  isProcessCode,
  isRoastLevelCode,
  type OriginCode,
  type ProcessCode,
  type RoastLevelCode,
} from "@/domain/coffee/bean-profile";
import type { Database } from "@/types/database";

import type { Coffee, CoffeeInput, CoffeeListStatus, CoffeeStatus } from "./types";

const COFFEE_SELECT = `
  id,
  bean_profile_id,
  roaster,
  product_name,
  roast_date,
  purchase_date,
  purchase_place,
  notes,
  status,
  bean_profiles!coffees_owned_bean_profile_fkey (
    id,
    origin_country_code,
    region,
    process,
    variety,
    roast_level,
    producer,
    farm
  )
`;

type CoffeeQueryRow = {
  bean_profile_id: string;
  bean_profiles: {
    farm: string | null;
    id: string;
    origin_country_code: string;
    process: string;
    producer: string | null;
    region: string | null;
    roast_level: string;
    variety: string | null;
  };
  id: string;
  notes: string | null;
  product_name: string | null;
  purchase_date: string | null;
  purchase_place: string | null;
  roast_date: string | null;
  roaster: string | null;
  status: string;
};

export class CoffeeNotFoundError extends Error {
  constructor() {
    super("Coffee not found.");
    this.name = "CoffeeNotFoundError";
  }
}

function readCanonicalValue<T extends string>(
  value: string,
  isValue: (candidate: string) => candidate is T,
  field: string,
) {
  if (!isValue(value)) {
    throw new Error(`Bean profile contains an invalid ${field}.`);
  }

  return value;
}

function toCoffee(row: CoffeeQueryRow): Coffee {
  return {
    beanProfile: {
      farm: row.bean_profiles.farm,
      id: row.bean_profiles.id,
      originCountry: readCanonicalValue<OriginCode>(
        row.bean_profiles.origin_country_code,
        isOriginCode,
        "origin country",
      ),
      process: readCanonicalValue<ProcessCode>(row.bean_profiles.process, isProcessCode, "process"),
      producer: row.bean_profiles.producer,
      region: row.bean_profiles.region,
      roastLevel: readCanonicalValue<RoastLevelCode>(
        row.bean_profiles.roast_level,
        isRoastLevelCode,
        "roast level",
      ),
      variety: row.bean_profiles.variety,
    },
    beanProfileId: row.bean_profile_id,
    id: row.id,
    notes: row.notes,
    productName: row.product_name,
    purchaseDate: row.purchase_date,
    purchasePlace: row.purchase_place,
    roastDate: row.roast_date,
    roaster: row.roaster,
    status: row.status as CoffeeStatus,
  };
}

export async function listCoffees(
  supabase: SupabaseClient<Database>,
  userId: string,
  status: CoffeeListStatus,
) {
  const { data, error } = await supabase
    .from("coffees")
    .select(COFFEE_SELECT)
    .eq("user_id", userId)
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load coffees.", { cause: error });
  }

  return (data as CoffeeQueryRow[]).map(toCoffee);
}

export async function getCoffee(
  supabase: SupabaseClient<Database>,
  userId: string,
  coffeeId: string,
) {
  const { data, error } = await supabase
    .from("coffees")
    .select(COFFEE_SELECT)
    .eq("id", coffeeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load coffee.", { cause: error });
  }

  return data ? toCoffee(data as CoffeeQueryRow) : null;
}

export async function createCoffee(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CoffeeInput,
) {
  const beanProfileId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const { error: beanError } = await supabase.from("bean_profiles").insert({
    farm: input.farm,
    id: beanProfileId,
    origin_country_code: input.originCountry,
    process: input.process,
    producer: input.producer,
    region: input.region,
    roast_level: input.roastLevel,
    user_id: userId,
    variety: input.variety,
  });

  if (beanError) {
    throw new Error("Unable to create bean profile.", { cause: beanError });
  }

  const { error: coffeeError } = await supabase.from("coffees").insert({
    bean_profile_id: beanProfileId,
    id: coffeeId,
    notes: input.notes,
    product_name: input.productName,
    purchase_date: input.purchaseDate,
    purchase_place: input.purchasePlace,
    roast_date: input.roastDate,
    roaster: input.roaster,
    status: "active",
    user_id: userId,
  });

  if (coffeeError) {
    await supabase.from("bean_profiles").delete().eq("id", beanProfileId).eq("user_id", userId);
    throw new Error("Unable to create coffee.", { cause: coffeeError });
  }

  return coffeeId;
}

export async function updateCoffee(
  supabase: SupabaseClient<Database>,
  userId: string,
  coffeeId: string,
  input: CoffeeInput,
) {
  const coffee = await getCoffee(supabase, userId, coffeeId);

  if (!coffee) {
    throw new CoffeeNotFoundError();
  }

  const { error: beanError } = await supabase
    .from("bean_profiles")
    .update({
      farm: input.farm,
      origin_country_code: input.originCountry,
      process: input.process,
      producer: input.producer,
      region: input.region,
      roast_level: input.roastLevel,
      variety: input.variety,
    })
    .eq("id", coffee.beanProfileId)
    .eq("user_id", userId);

  if (beanError) {
    throw new Error("Unable to update bean profile.", { cause: beanError });
  }

  const { error: coffeeError } = await supabase
    .from("coffees")
    .update({
      notes: input.notes,
      product_name: input.productName,
      purchase_date: input.purchaseDate,
      purchase_place: input.purchasePlace,
      roast_date: input.roastDate,
      roaster: input.roaster,
    })
    .eq("id", coffeeId)
    .eq("user_id", userId);

  if (coffeeError) {
    throw new Error("Unable to update coffee.", { cause: coffeeError });
  }
}

export async function archiveCoffee(
  supabase: SupabaseClient<Database>,
  userId: string,
  coffeeId: string,
) {
  const { data, error } = await supabase
    .from("coffees")
    .update({ status: "archived" })
    .eq("id", coffeeId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to archive coffee.", { cause: error });
  }

  if (!data) {
    throw new CoffeeNotFoundError();
  }
}
