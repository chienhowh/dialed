import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

let owner: TestUser;
let otherUser: TestUser;

function authenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase test environment is missing.");
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function createCoffee(client: SupabaseClient, user: TestUser) {
  const { error: signInError } = await client.auth.signInWithPassword(user);
  expect(signInError).toBeNull();
  const beanProfileId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const { error: beanError } = await client.from("bean_profiles").insert({
    id: beanProfileId,
    origin_country_code: "ET",
    process: "washed",
    region: "Sidama",
    roast_level: "light",
    user_id: user.id,
    variety: "74158",
  });
  expect(beanError).toBeNull();
  const { error: coffeeError } = await client.from("coffees").insert({
    bean_profile_id: beanProfileId,
    id: coffeeId,
    product_name: "Recommendation Coffee",
    roaster: "Dialed Test Roaster",
    user_id: user.id,
  });
  expect(coffeeError).toBeNull();
  return coffeeId;
}

test.beforeAll(async () => {
  [owner, otherUser] = await Promise.all([
    createTestUser("brew-plan-owner"),
    createTestUser("brew-plan-other"),
  ]);
});

test.afterAll(async () => {
  await Promise.all([deleteTestUser(owner), deleteTestUser(otherUser)]);
});

test("creates, explains, snapshots, edits, and isolates a recommended Brew Plan", async ({ page }) => {
  test.setTimeout(60_000);
  const ownerClient = authenticatedClient();
  const coffeeId = await createCoffee(ownerClient, owner);
  await signIn(page, owner);
  await page.goto(`/coffee/${coffeeId}`);

  await expect(page.getByText(/Taste Goal/i)).toHaveCount(0);
  await page.getByRole("link", { name: "Brew This Coffee" }).click();
  await expect(page).toHaveURL(`/coffee/${coffeeId}/brew`);
  await expect(page.getByRole("heading", { name: "How do you want it today?" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sweet/ })).toHaveAttribute("required", "");

  await page.getByRole("button", { name: "Find a Brew Plan" }).click();
  await expect(page).toHaveURL(`/coffee/${coffeeId}/brew`);

  await page.getByText("Sweet", { exact: true }).click();
  await page.getByRole("button", { name: "+ Add secondary goal" }).click();
  await expect(page.getByRole("option", { name: "Sweet" })).toBeDisabled();
  await page.locator('option[value="sweet"]').evaluate((option) => {
    (option as HTMLOptionElement).disabled = false;
  });
  await page.getByLabel("Secondary goal (optional)").selectOption("sweet");
  await page.getByRole("button", { name: "Find a Brew Plan" }).click();
  await expect(page.getByText("Secondary goal must be different from the primary goal.")).toBeVisible();

  await page.getByLabel("Secondary goal (optional)").selectOption("clean");
  await page.getByRole("button", { name: "Find a Brew Plan" }).click();
  await expect(page).toHaveURL(/\/brew\/[0-9a-f-]+$/);
  const brewPlanId = new URL(page.url()).pathname.split("/").at(-1);
  expect(brewPlanId).toBeTruthy();

  await expect(page.getByRole("heading", { name: "Three Pour" })).toBeVisible();
  await expect(page.getByText("Sweet + Clean", { exact: true })).toBeVisible();
  await expect(page.getByText("15g", { exact: true })).toBeVisible();
  await expect(page.getByText("240g", { exact: true })).toBeVisible();
  await expect(page.getByText("92°C", { exact: true })).toBeVisible();
  await page.getByText("Why this brew?").click();
  await expect(page.getByText(/Washed process supports/)).toBeVisible();
  await expect(page.getByText(/free-form region “Sidama”/)).toBeVisible();

  const { data: planBeforeEdit, error: planError } = await ownerClient
    .from("brew_plans")
    .select("dial_in_thread_id, recipe_template_id, recommendation_source")
    .eq("id", brewPlanId ?? "")
    .single();
  expect(planError).toBeNull();
  expect(planBeforeEdit?.recommendation_source).toBe("official_rule");

  const { data: templateSteps, error: templateStepsError } = await ownerClient
    .from("recipe_steps")
    .select("step_order, step_type, start_time, duration, target_water, note")
    .eq("recipe_template_id", planBeforeEdit?.recipe_template_id ?? "")
    .order("step_order");
  const { data: planSteps, error: planStepsError } = await ownerClient
    .from("brew_plan_steps")
    .select("step_order, step_type, start_time, duration, target_water, note")
    .eq("brew_plan_id", brewPlanId ?? "")
    .order("step_order");
  expect(templateStepsError).toBeNull();
  expect(planStepsError).toBeNull();
  expect(planSteps).toEqual(templateSteps);

  await page.getByRole("link", { name: "Edit Plan" }).click();
  await page.getByLabel("Water (g)", { exact: true }).fill("250");
  await page.getByLabel("Ratio (1:x)").fill("16.67");
  await page.getByLabel("Temperature (°C)").fill("90");
  await page.getByLabel("Grind level").fill("fine");
  await page.getByLabel("Cumulative target water (g)").first().fill("45");
  await page.getByRole("button", { name: "Save Plan" }).click();

  await expect(page).toHaveURL(`/brew/${brewPlanId}`);
  await expect(page.getByText("Edited", { exact: true })).toBeVisible();
  await expect(page.getByText("250g", { exact: true })).toBeVisible();
  await expect(page.getByText("90°C", { exact: true })).toBeVisible();
  await expect(page.getByText(/Ratio 1:16.7 · fine/)).toBeVisible();

  const { data: planAfterEdit, error: planAfterEditError } = await ownerClient
    .from("brew_plans")
    .select("water_amount, water_temperature, grind_level, recommendation_source")
    .eq("id", brewPlanId ?? "")
    .single();
  expect(planAfterEditError).toBeNull();
  expect(planAfterEdit).toMatchObject({
    grind_level: "fine",
    recommendation_source: "manual",
    water_amount: 250,
    water_temperature: 90,
  });
  const { data: thread, error: threadError } = await ownerClient
    .from("dial_in_threads")
    .select("primary_taste_goal, secondary_taste_goal")
    .eq("id", planBeforeEdit?.dial_in_thread_id ?? "")
    .single();
  expect(threadError).toBeNull();
  expect(thread).toEqual({ primary_taste_goal: "sweet", secondary_taste_goal: "clean" });
  const { data: template, error: templateError } = await ownerClient
    .from("recipe_templates")
    .select("default_ratio, default_temperature, default_grind_level")
    .eq("id", planBeforeEdit?.recipe_template_id ?? "")
    .single();
  expect(templateError).toBeNull();
  expect(template).toEqual({ default_grind_level: "medium-fine", default_ratio: 16, default_temperature: 92 });

  await page.getByRole("link", { name: "Start Brewing" }).click();
  await expect(page.getByText("Milestone 5")).toBeVisible();
  await expect(page.getByText("No Brew Session or timer has been created.")).toBeVisible();
  const { count: sessionCount, error: sessionError } = await ownerClient
    .from("brew_sessions")
    .select("id", { count: "exact", head: true })
    .eq("brew_plan_id", brewPlanId ?? "");
  expect(sessionError).toBeNull();
  expect(sessionCount).toBe(0);

  const otherClient = authenticatedClient();
  const { error: otherSignInError } = await otherClient.auth.signInWithPassword(otherUser);
  expect(otherSignInError).toBeNull();
  const { data: privatePlans, error: privatePlanError } = await otherClient
    .from("brew_plans")
    .select("id")
    .eq("id", brewPlanId ?? "");
  const { data: privateThreads, error: privateThreadError } = await otherClient
    .from("dial_in_threads")
    .select("id")
    .eq("id", planBeforeEdit?.dial_in_thread_id ?? "");
  expect(privatePlanError).toBeNull();
  expect(privateThreadError).toBeNull();
  expect(privatePlans).toEqual([]);
  expect(privateThreads).toEqual([]);
  const { data: mutatedPlans, error: mutatePlanError } = await otherClient
    .from("brew_plans")
    .update({ grind_level: "forbidden" })
    .eq("id", brewPlanId ?? "")
    .select("id");
  const { data: mutatedThreads, error: mutateThreadError } = await otherClient
    .from("dial_in_threads")
    .update({ status: "abandoned" })
    .eq("id", planBeforeEdit?.dial_in_thread_id ?? "")
    .select("id");
  expect(mutatePlanError).toBeNull();
  expect(mutateThreadError).toBeNull();
  expect(mutatedPlans).toEqual([]);
  expect(mutatedThreads).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, otherUser);
  await page.goto(`/brew/${brewPlanId}`);
  await expect(page.getByRole("heading", { name: "Brew Plan not found" })).toBeVisible();
});
