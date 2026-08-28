import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

let owner: TestUser;
let otherUser: TestUser;

test.beforeAll(async () => {
  [owner, otherUser] = await Promise.all([createTestUser("coffee-owner"), createTestUser("coffee-other")]);
});

test.afterAll(async () => {
  await Promise.all([deleteTestUser(owner), deleteTestUser(otherUser)]);
});

test("creates, displays, edits, archives, and isolates a coffee", async ({ page }) => {
  await signIn(page, owner);

  await expect(page.getByRole("heading", { name: "Add your first coffee" })).toBeVisible();
  await page.getByRole("link", { name: "+ Add Coffee" }).click();
  await expect(page).toHaveURL("/coffee/new");
  await expect(page.getByText(/Taste Goal/i)).toHaveCount(0);

  await page.getByRole("combobox", { name: "Origin" }).fill("Eth");
  await page.getByRole("option", { name: "Ethiopia ET" }).click();
  await page.getByLabel("Region").fill("Sidama");
  await page.getByLabel("Process *").selectOption("washed");
  await page.getByLabel("Roast Level *").selectOption("light");
  await page.getByLabel("Variety").fill("74158");
  await page.getByText("More details").click();
  await page.getByLabel("Roaster").fill("Simple Kaffa");
  await page.getByLabel("Coffee Name").fill("Hamasho");
  await page.getByLabel("Producer").fill("Ture Waji");
  await page.getByLabel("Farm").fill("Buku");
  await page.getByLabel("Roast Date").fill("2026-08-15");
  await page.getByLabel("Purchase Date").fill("2026-08-21");
  await page.getByLabel("Purchase Place").fill("Local cafe");
  await page.getByLabel("Notes").fill("Floral and tea-like");
  await page.getByRole("button", { name: "Save Coffee" }).click();

  await expect(page).toHaveURL(/\/coffee\/[0-9a-f-]+$/);
  const coffeeId = new URL(page.url()).pathname.split("/").at(-1);
  expect(coffeeId).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Hamasho" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bean Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Coffee" })).toBeVisible();
  await expect(page.getByText("Ethiopia", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Washed", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Brew This Coffee" }).click();
  await expect(page.getByText("Milestone 4")).toBeVisible();
  await expect(page.getByText("No brewing data has been created.")).toBeVisible();
  await page.getByRole("link", { name: "Back to Coffee" }).click();

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Ethiopia");
  await expect(page.getByLabel("Process *")).toHaveValue("washed");
  await expect(page.getByLabel("Roast Level *")).toHaveValue("light");
  await page.getByLabel("Region").fill("Bensa");
  await page.getByLabel("Process *").selectOption("natural");
  await page.getByLabel("Roast Level *").selectOption("medium_light");
  await page.getByText("More details").click();
  await page.getByLabel("Roaster").fill("Updated Roaster");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Bensa", { exact: true })).toBeVisible();
  await expect(page.getByText("Natural", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Medium Light", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Updated Roaster", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("heading", { name: "Hamasho" })).toBeVisible();
  await page.getByRole("link", { name: "Coffee", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hamasho" })).toBeVisible();
  await page.getByRole("link", { name: "Hamasho", exact: true }).click();
  await page.getByRole("button", { name: "Archive Coffee" }).click();

  await expect(page).toHaveURL("/coffee");
  await expect(page.getByRole("heading", { name: "No active coffees" })).toBeVisible();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("heading", { name: "Add your first coffee" })).toBeVisible();
  await page.getByRole("link", { name: "Coffee", exact: true }).click();
  await page.getByRole("link", { name: "Archived" }).click();
  await expect(page.getByRole("heading", { name: "Hamasho" })).toBeVisible();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey || !coffeeId) throw new Error("Supabase test environment is missing.");

  const ownerClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: ownerSignInError } = await ownerClient.auth.signInWithPassword(owner);
  expect(ownerSignInError).toBeNull();
  const { data: coffeeRow, error: coffeeReadError } = await ownerClient
    .from("coffees")
    .select("bean_profile_id")
    .eq("id", coffeeId)
    .single();
  expect(coffeeReadError).toBeNull();
  const { data: beanProfile, error: beanReadError } = await ownerClient
    .from("bean_profiles")
    .select("origin_country_code, process, region, roast_level, variety")
    .eq("id", coffeeRow?.bean_profile_id ?? "")
    .single();
  expect(beanReadError).toBeNull();
  expect(beanProfile).toEqual({
    origin_country_code: "ET",
    process: "natural",
    region: "Bensa",
    roast_level: "medium_light",
    variety: "74158",
  });

  const otherClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await otherClient.auth.signInWithPassword(otherUser);
  expect(signInError).toBeNull();

  const { data: privateRows, error: readError } = await otherClient.from("coffees").select("id").eq("id", coffeeId);
  expect(readError).toBeNull();
  expect(privateRows).toEqual([]);

  const { data: mutatedRows, error: mutationError } = await otherClient
    .from("coffees")
    .update({ notes: "forbidden" })
    .eq("id", coffeeId)
    .select("id");
  expect(mutationError).toBeNull();
  expect(mutatedRows).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, otherUser);
  await page.goto(`/coffee/${coffeeId}`);
  await expect(page.getByRole("heading", { name: "Coffee not found" })).toBeVisible();
});
