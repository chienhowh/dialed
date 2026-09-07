import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "../src/types/database";
import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

type BrewStatus = "aborted" | "brewing" | "completed";

let owner: TestUser;
let otherUser: TestUser;

function client(serviceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase test environment is missing.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function ownerClient() {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword(owner);
  expect(error).toBeNull();
  return supabase;
}

async function createBrewContext(user: TestUser, status: BrewStatus = "completed") {
  const admin = client(true);
  const beanProfileId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const threadId = crypto.randomUUID();
  const brewPlanId = crypto.randomUUID();
  const planStepId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  const { error: beanError } = await admin.from("bean_profiles").insert({
    id: beanProfileId,
    origin_country_code: "ET",
    process: "washed",
    roast_level: "light",
    user_id: user.id,
  });
  expect(beanError).toBeNull();
  const { error: coffeeError } = await admin.from("coffees").insert({
    bean_profile_id: beanProfileId,
    id: coffeeId,
    product_name: "Feedback Journey Coffee",
    user_id: user.id,
  });
  expect(coffeeError).toBeNull();
  const { error: threadError } = await admin.from("dial_in_threads").insert({
    coffee_id: coffeeId,
    id: threadId,
    primary_taste_goal: "sweet",
    user_id: user.id,
  });
  expect(threadError).toBeNull();
  const { error: planError } = await admin.from("brew_plans").insert({
    coffee_dose: 15,
    coffee_id: coffeeId,
    dial_in_thread_id: threadId,
    expected_flavor: "Sweet and clean",
    grind_level: "medium-fine",
    id: brewPlanId,
    ratio: 16,
    recipe_template_id: "10000000-0000-4000-8000-000000000001",
    recommendation_reason: "Feedback E2E fixture",
    recommendation_source: "official_rule",
    target_brew_time_max: 160,
    target_brew_time_min: 135,
    user_id: user.id,
    water_amount: 240,
    water_temperature: 92,
  });
  expect(planError).toBeNull();
  const { error: stepError } = await admin.from("brew_plan_steps").insert({
    brew_plan_id: brewPlanId,
    id: planStepId,
    start_time: 0,
    step_order: 1,
    step_type: "pour",
    target_water: 240,
  });
  expect(stepError).toBeNull();
  const { error: sessionError } = await admin.from("brew_sessions").insert({
    actual_brew_time: status === "completed" ? 151 : null,
    brew_plan_id: brewPlanId,
    finished_at: status === "brewing" ? null : new Date().toISOString(),
    id: sessionId,
    started_at: new Date(Date.now() - 151_000).toISOString(),
    status,
    user_id: user.id,
  });
  expect(sessionError).toBeNull();

  return { brewPlanId, coffeeId, sessionId, threadId };
}

function feedbackPath(context: Awaited<ReturnType<typeof createBrewContext>>) {
  return `/brew/${context.brewPlanId}/session/${context.sessionId}/feedback`;
}

async function expectOnePlan(supabase: ReturnType<typeof client>, threadId: string) {
  const { data, error } = await supabase
    .from("brew_plans")
    .select("coffee_dose, water_amount, ratio, water_temperature, grind_level")
    .eq("dial_in_thread_id", threadId);
  expect(error).toBeNull();
  expect(data).toEqual([{
    coffee_dose: 15,
    grind_level: "medium-fine",
    ratio: 16,
    water_amount: 240,
    water_temperature: 92,
  }]);
}

test.beforeAll(async () => {
  [owner, otherUser] = await Promise.all([
    createTestUser("feedback-owner"),
    createTestUser("feedback-other"),
  ]);
});

test.afterAll(async () => {
  await Promise.all([deleteTestUser(owner), deleteTestUser(otherUser)]);
});

test("Pretty Good persists a held Decision and returns to Coffee Detail", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too sour", { exact: true }).click();
  await page.getByText("Pretty good", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Too sour" })).not.toBeChecked();
  await page.getByText("Too weak", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Pretty good" })).not.toBeChecked();
  await page.getByText("Pretty good", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Too weak" })).not.toBeChecked();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByRole("heading", { name: "Dialed in" })).toBeVisible();
  await expect(page.getByText("Keep this brew unchanged.")).toBeVisible();
  await expect(page.getByText("Try this next")).toHaveCount(0);

  const { data: feedback } = await supabase
    .from("taste_feedback")
    .select("id")
    .eq("brew_session_id", context.sessionId)
    .single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("status, selected_direction, recommended_candidate, selected_candidate, candidate_knowledge_version")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toEqual({
    candidate_knowledge_version: null,
    recommended_candidate: null,
    selected_candidate: null,
    selected_direction: "hold",
    status: "held",
  });
  await expectOnePlan(supabase, context.threadId);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dialed in" })).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(`/coffee/${context.coffeeId}`);
});

test("single supported direction restores saved Feedback and persists the recommendation", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too sour", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByText("Try this next")).toBeVisible();
  await expect(page.getByText("★ Recommended")).toBeVisible();
  await expect(page.getByText("Grind finer", { exact: true })).toBeVisible();
  await expect(page.getByText("Increase water temperature", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Feedback saved")).toBeVisible();
  const { count: feedbackCount } = await supabase
    .from("taste_feedback")
    .select("id", { count: "exact", head: true })
    .eq("brew_session_id", context.sessionId);
  expect(feedbackCount).toBe(1);

  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByRole("heading", { name: "Adjustment saved" })).toBeVisible();
  await expect(page.getByText("Grind finer", { exact: true })).toBeVisible();

  const { data: feedback } = await supabase.from("taste_feedback").select("id").eq("brew_session_id", context.sessionId).single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("status, selected_direction, recommended_candidate, selected_candidate")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toMatchObject({
    recommended_candidate: { changeDirection: "finer", parameter: "grind" },
    selected_candidate: { changeDirection: "finer", parameter: "grind" },
    selected_direction: "increase_extraction",
    status: "pending",
  });
  await expectOnePlan(supabase, context.threadId);
});

test("multiple signals ask for one direction and show only that catalog", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too sour", { exact: true }).click();
  await page.getByText("Too weak", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByRole("heading", { name: "What should we improve first?" })).toBeVisible();
  await page.getByText("Increase strength", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Use less water", { exact: true })).toBeVisible();
  await expect(page.getByText("Other option")).toHaveCount(0);
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByRole("heading", { name: "Adjustment saved" })).toBeVisible();

  const { data: feedback } = await supabase.from("taste_feedback").select("id").eq("brew_session_id", context.sessionId).single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("inferred_directions, selected_direction, selected_candidate")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toMatchObject({
    inferred_directions: ["increase_extraction", "increase_strength"],
    selected_candidate: { changeDirection: "lower", parameter: "water" },
    selected_direction: "increase_strength",
  });
});

test("an alternative Candidate preserves Dialed's different recommendation", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too sour", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText("Increase water temperature", { exact: true }).click();
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByRole("heading", { name: "Adjustment saved" })).toBeVisible();

  const { data: feedback } = await supabase.from("taste_feedback").select("id").eq("brew_session_id", context.sessionId).single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("recommended_candidate, selected_candidate")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toMatchObject({
    recommended_candidate: { changeDirection: "finer", parameter: "grind" },
    selected_candidate: { changeDirection: "higher", parameter: "temperature" },
  });
});

test("Astringent persists an unsupported result without guessing a Candidate", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Astringent", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByRole("heading", { name: "Direction saved" })).toBeVisible();
  await expect(page.getByText(/does not yet have a reviewed one-variable adjustment/)).toBeVisible();
  await expect(page.getByText("Grind coarser")).toHaveCount(0);

  const { data: feedback } = await supabase.from("taste_feedback").select("id").eq("brew_session_id", context.sessionId).single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("status, selected_direction, recommended_candidate, selected_candidate, candidate_knowledge_version")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toEqual({
    candidate_knowledge_version: "candidate-catalog-v1",
    recommended_candidate: null,
    selected_candidate: null,
    selected_direction: "reduce_astringency",
    status: "unsupported",
  });
});

test("ownership and Brew Session lifecycle guard direct Feedback access", async ({ page }) => {
  const completed = await createBrewContext(owner, "completed");
  const brewing = await createBrewContext(owner, "brewing");
  const aborted = await createBrewContext(owner, "aborted");

  await signIn(page, otherUser);
  await page.goto(feedbackPath(completed));
  await expect(page.getByRole("heading", { name: "Brew Plan not found" })).toBeVisible();

  await signIn(page, owner);
  await page.goto(feedbackPath(brewing));
  await expect(page).toHaveURL(`/brew/${brewing.brewPlanId}/start`);
  await page.goto(feedbackPath(aborted));
  await expect(page.getByRole("heading", { name: "Brew Plan not found" })).toBeVisible();
  await page.goto(feedbackPath(completed));
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
});
