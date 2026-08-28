import { describe, expect, it } from "vitest";

import { parseCoffeeFormData } from "./coffee-form";

function makeFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("parseCoffeeFormData", () => {
  it("normalizes a complete coffee form without taste-goal data", () => {
    const result = parseCoffeeFormData(
      makeFormData({
        farm: "Buku",
        notes: "  Floral and tea-like  ",
        originCountry: " ET ",
        process: "washed",
        producer: "Ture Waji",
        productName: "Hamasho",
        purchaseDate: "2026-08-21",
        purchasePlace: "Local cafe",
        region: "Sidama",
        roastDate: "2026-08-15",
        roastLevel: "light",
        roaster: "Simple Kaffa",
        variety: "74158",
      }),
    );

    expect(result).toEqual({
      data: {
        farm: "Buku",
        notes: "Floral and tea-like",
        originCountry: "ET",
        process: "washed",
        producer: "Ture Waji",
        productName: "Hamasho",
        purchaseDate: "2026-08-21",
        purchasePlace: "Local cafe",
        region: "Sidama",
        roastDate: "2026-08-15",
        roastLevel: "light",
        roaster: "Simple Kaffa",
        variety: "74158",
      },
      success: true,
    });
  });

  it("keeps region and expanded fields optional", () => {
    const result = parseCoffeeFormData(
      makeFormData({ originCountry: "KE", process: "washed", roastLevel: "light" }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.region).toBeNull();
      expect(result.data.productName).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("keeps region and variety flexible while trimming their values", () => {
    const result = parseCoffeeFormData(
      makeFormData({
        originCountry: "KE",
        process: "natural",
        region: "  Nyeri AA lot  ",
        roastLevel: "medium_light",
        variety: "  SL28 / SL34  ",
      }),
    );

    expect(result).toMatchObject({
      data: { region: "Nyeri AA lot", variety: "SL28 / SL34" },
      success: true,
    });
  });

  it("rejects arbitrary origin strings and non-ISO codes", () => {
    for (const originCountry of ["Ethiopia", "et", "ZZ"]) {
      const result = parseCoffeeFormData(
        makeFormData({ originCountry, process: "washed", roastLevel: "light" }),
      );

      expect(result).toMatchObject({
        errors: { originCountry: "Select a country from the list." },
        success: false,
      });
    }
  });

  it("rejects process and roast labels or unsupported values", () => {
    for (const process of ["Washed", "anaerobic"]) {
      expect(
        parseCoffeeFormData(makeFormData({ originCountry: "ET", process, roastLevel: "light" })),
      ).toMatchObject({ errors: { process: "Select a valid process." }, success: false });
    }

    expect(
      parseCoffeeFormData(
        makeFormData({ originCountry: "ET", process: "washed", roastLevel: "Light" }),
      ),
    ).toMatchObject({ errors: { roastLevel: "Select a valid roast level." }, success: false });
  });

  it("rejects missing core fields", () => {
    const result = parseCoffeeFormData(makeFormData({ region: "Nyeri" }));

    expect(result).toMatchObject({
      errors: {
        originCountry: "This field is required.",
        process: "This field is required.",
        roastLevel: "This field is required.",
      },
      success: false,
    });
  });

  it("rejects invalid calendar dates", () => {
    const result = parseCoffeeFormData(
      makeFormData({
        originCountry: "KE",
        process: "washed",
        roastDate: "2026-02-30",
        roastLevel: "light",
      }),
    );

    expect(result).toMatchObject({ errors: { roastDate: "Enter a valid date." }, success: false });
  });
});
