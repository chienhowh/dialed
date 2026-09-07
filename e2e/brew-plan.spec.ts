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

test("creates, edits, executes, resumes, completes, and isolates a Brew Plan", async ({ context, page }) => {
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
  const recommendationExplanation = page.locator("details").filter({ hasText: "Why this brew?" });
  await expect(recommendationExplanation).toContainText("No reviewed strategy rule is available for the primary Sweet goal.");
  await expect(recommendationExplanation).toContainText("Clean remains secondary context and did not change this starting point.");
  await expect(recommendationExplanation).toContainText("configured product fallback");
  await expect(recommendationExplanation).not.toContainText("Washed process");
  await expect(recommendationExplanation).not.toContainText("Sidama");

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

  const { data: coffeeAfterEdit, error: coffeeAfterEditError } = await ownerClient
    .from("coffees")
    .select("bean_profile_id, product_name")
    .eq("id", coffeeId)
    .single();
  expect(coffeeAfterEditError).toBeNull();
  expect(coffeeAfterEdit?.product_name).toBe("Recommendation Coffee");
  const { data: beanAfterEdit, error: beanAfterEditError } = await ownerClient
    .from("bean_profiles")
    .select("origin_country_code, process, region, roast_level, variety")
    .eq("id", coffeeAfterEdit?.bean_profile_id ?? "")
    .single();
  expect(beanAfterEditError).toBeNull();
  expect(beanAfterEdit).toEqual({
    origin_country_code: "ET",
    process: "washed",
    region: "Sidama",
    roast_level: "light",
    variety: "74158",
  });

  await page.getByRole("link", { name: "Start Brewing" }).click();
  await expect(page.getByText("Ready to brew")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  const { count: sessionCount, error: sessionError } = await ownerClient
    .from("brew_sessions")
    .select("id", { count: "exact", head: true })
    .eq("brew_plan_id", brewPlanId ?? "");
  expect(sessionError).toBeNull();
  expect(sessionCount).toBe(0);

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bloom" })).toBeVisible();
  await expect(page.getByText("45g", { exact: true })).toBeVisible();

  await expect.poll(async () => {
    const { count } = await ownerClient
      .from("brew_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brew_plan_id", brewPlanId ?? "");
    return count;
  }).toBe(1);

  const { data: startedSession, error: startedSessionError } = await ownerClient
    .from("brew_sessions")
    .select("id, brew_plan_id, status")
    .eq("brew_plan_id", brewPlanId ?? "")
    .single();
  expect(startedSessionError).toBeNull();
  expect(startedSession).toMatchObject({ brew_plan_id: brewPlanId, status: "brewing" });

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Second pour" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Second pour" })).toBeVisible();
  const { count: resumedSessionCount } = await ownerClient
    .from("brew_sessions")
    .select("id", { count: "exact", head: true })
    .eq("brew_plan_id", brewPlanId ?? "");
  expect(resumedSessionCount).toBe(1);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Final pour" })).toBeVisible();
  await page.getByRole("button", { name: "Finish Brew" }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await context.setOffline(false);

  await expect(page).toHaveURL(new RegExp(`/brew/${brewPlanId}/session/${startedSession?.id}/feedback$`));
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pretty good" })).toBeVisible();

  const { data: completedSession, error: completedSessionError } = await ownerClient
    .from("brew_sessions")
    .select("id, brew_plan_id, status, finished_at, actual_brew_time, actual_coffee_dose, actual_water_amount, actual_water_temperature")
    .eq("id", startedSession?.id ?? "")
    .single();
  expect(completedSessionError).toBeNull();
  expect(completedSession).toMatchObject({
    actual_coffee_dose: 15,
    actual_water_amount: 250,
    actual_water_temperature: 90,
    brew_plan_id: brewPlanId,
    status: "completed",
  });
  expect(completedSession?.finished_at).not.toBeNull();
  expect(completedSession?.actual_brew_time).not.toBeNull();

  const { data: completedSteps, error: completedStepsError } = await ownerClient
    .from("brew_session_steps")
    .select("actual_start_time, actual_end_time, actual_water, brew_plan_steps!inner(step_order)")
    .eq("brew_session_id", startedSession?.id ?? "")
    .order("step_order", { referencedTable: "brew_plan_steps" });
  expect(completedStepsError).toBeNull();
  expect(completedSteps).toHaveLength(3);
  expect(completedSteps?.map(({ actual_water }) => actual_water)).toEqual([45, 120, 240]);
  expect(completedSteps?.every(({ actual_end_time, actual_start_time }) => (
    actual_start_time !== null && actual_end_time !== null && actual_end_time >= actual_start_time
  ))).toBe(true);

  const { count: feedbackCount } = await ownerClient
    .from("taste_feedback")
    .select("id", { count: "exact", head: true })
    .eq("brew_session_id", startedSession?.id ?? "");
  const { count: adjustmentCount } = await ownerClient
    .from("adjustment_decisions")
    .select("id", { count: "exact", head: true });
  expect(feedbackCount).toBe(0);
  expect(adjustmentCount).toBe(0);
  expect(await page.evaluate(() => window.localStorage.getItem("dialed.active-brew.v1"))).toBeNull();

  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.getByText("This plan is locked to preserve its Brew Session history.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit Plan" })).toHaveCount(0);
  await page.goto(`/brew/${brewPlanId}/edit`);
  await expect(page).toHaveURL(`/brew/${brewPlanId}`);

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
  const { data: privateSessions, error: privateSessionError } = await otherClient
    .from("brew_sessions")
    .select("id")
    .eq("id", startedSession?.id ?? "");
  expect(privatePlanError).toBeNull();
  expect(privateThreadError).toBeNull();
  expect(privateSessionError).toBeNull();
  expect(privatePlans).toEqual([]);
  expect(privateThreads).toEqual([]);
  expect(privateSessions).toEqual([]);
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
  await page.goto(`/brew/${brewPlanId}/session/${startedSession?.id}/feedback`);
  await expect(page.getByRole("heading", { name: "Brew Plan not found" })).toBeVisible();
});
