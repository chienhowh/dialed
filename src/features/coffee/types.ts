import type { OriginCode, ProcessCode, RoastLevelCode } from "@/domain/coffee/bean-profile";

export type CoffeeStatus = "active" | "finished" | "archived";
export type CoffeeListStatus = Extract<CoffeeStatus, "active" | "archived">;

export type BeanProfile = {
  farm: string | null;
  id: string;
  originCountry: OriginCode;
  process: ProcessCode;
  producer: string | null;
  region: string | null;
  roastLevel: RoastLevelCode;
  variety: string | null;
};

export type Coffee = {
  beanProfile: BeanProfile;
  beanProfileId: string;
  id: string;
  notes: string | null;
  productName: string | null;
  purchaseDate: string | null;
  purchasePlace: string | null;
  roastDate: string | null;
  roaster: string | null;
  status: CoffeeStatus;
};

export type CoffeeInput = {
  farm: string | null;
  notes: string | null;
  originCountry: OriginCode;
  process: ProcessCode;
  producer: string | null;
  productName: string | null;
  purchaseDate: string | null;
  purchasePlace: string | null;
  region: string | null;
  roastDate: string | null;
  roastLevel: RoastLevelCode;
  roaster: string | null;
  variety: string | null;
};
