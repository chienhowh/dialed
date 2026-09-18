import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { createTasteFeedback } from "../src/features/feedback/repository";
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

async function createBrewContext(
  user: TestUser,
  status: BrewStatus = "completed",
  options: { grindLevel?: string } = {},
) {
  const admin = client(true);
  const beanProfileId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const threadId = crypto.randomUUID();
  const brewPlanId = crypto.randomUUID();
  const planStepIds = Array.from({ length: 5 }, () => crypto.randomUUID());
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
    grind_level: options.grindLevel ?? "medium-fine",
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
  const { error: stepError } = await admin.from("brew_plan_steps").insert([
    {
      brew_plan_id: brewPlanId,
      duration: 10,
      id: planStepIds[0],
      note: "First pour",
      start_time: 0,
      step_order: 1,
      step_type: "pour",
      target_water: 60,
    },
    {
      brew_plan_id: brewPlanId,
      duration: 20,
      id: planStepIds[1],
      note: "Bloom wait",
      start_time: 10,
      step_order: 2,
      step_type: "wait",
      target_water: null,
    },
    {
      brew_plan_id: brewPlanId,
      id: planStepIds[2],
      note: "Second pour",
      start_time: 30,
      step_order: 3,
      step_type: "pour",
      target_water: 120,
    },
    {
      brew_plan_id: brewPlanId,
      id: planStepIds[3],
      note: "Third pour",
      start_time: 60,
      step_order: 4,
      step_type: "pour",
      target_water: 180,
    },
    {
      brew_plan_id: brewPlanId,
      id: planStepIds[4],
      note: "Final pour",
      start_time: 90,
      step_order: 5,
      step_type: "pour",
      target_water: 240,
    },
  ]);
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

  return { brewPlanId, coffeeId, planStepIds, sessionId, threadId };
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

test("Brew Complete preserves optional sensory details and persists a held Decision", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await expect(page.getByText("Brew Complete", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Quick taste feedback" })).toBeVisible();
  const sensoryDetails = page.locator("details").filter({ hasText: "Add sensory details" });
  await expect(sensoryDetails).not.toHaveAttribute("open", "");
  await expect(page.getByLabel("Sweetness")).not.toBeVisible();

  await sensoryDetails.getByText("Add sensory details", { exact: true }).click();
  await page.getByLabel("Sweetness").selectOption("4");
  await page.getByLabel("Acidity").selectOption("3");
  await page.getByText("Floral", { exact: true }).click();
  await page.getByLabel("Other flavor tags").fill("Jasmine, Peach");
  await page.getByLabel("Notes").fill("Clean finish");
  await sensoryDetails.getByText("Add sensory details", { exact: true }).click();
  await expect(page.getByLabel("Sweetness")).not.toBeVisible();
  await sensoryDetails.getByText("Add sensory details", { exact: true }).click();
  await expect(page.getByLabel("Sweetness")).toHaveValue("4");
  await expect(page.getByLabel("Acidity")).toHaveValue("3");
  await expect(page.getByRole("checkbox", { name: "Floral" })).toBeChecked();
  await expect(page.getByLabel("Other flavor tags")).toHaveValue("Jasmine, Peach");
  await expect(page.getByLabel("Notes")).toHaveValue("Clean finish");

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
  await expect(page.getByRole("button", { name: "Continue Dial-in" })).toHaveCount(0);

  const { data: feedback } = await supabase
    .from("taste_feedback")
    .select("acidity, brew_session_id, flavor_tags, id, notes, sweetness")
    .eq("brew_session_id", context.sessionId)
    .single();
  expect(feedback).toMatchObject({
    acidity: 3,
    brew_session_id: context.sessionId,
    flavor_tags: ["Floral", "Jasmine", "Peach"],
    notes: "Clean finish",
    sweetness: 4,
  });
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

test("Continue Dial-in applies the selected grind Candidate and restores one persisted result", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  const sensoryDetails = page.locator("details").filter({ hasText: "Add sensory details" });
  await expect(sensoryDetails).not.toHaveAttribute("open", "");
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
  const { data: persistedFeedback } = await supabase
    .from("taste_feedback")
    .select("id, pretty_good, too_sour")
    .eq("brew_session_id", context.sessionId)
    .single();
  const retryFeedback = await createTasteFeedback(supabase, owner.id, context.sessionId, {
    acidity: null,
    astringent: false,
    body: null,
    clarity: null,
    complexity: null,
    flavorTags: [],
    juiciness: null,
    notes: null,
    overallRating: null,
    pretty_good: true,
    sweetness: null,
    too_bitter: false,
    too_sour: false,
    too_strong: false,
    too_weak: false,
  });
  expect(retryFeedback).toMatchObject({
    id: persistedFeedback?.id,
    pretty_good: false,
    too_sour: true,
  });

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

  await page.reload();
  await expect(page.getByRole("heading", { name: "Adjustment saved" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue Dial-in" })).toBeVisible();
  await page.getByRole("button", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(/\/brew\/[0-9a-f-]+$/);
  const generatedPlanId = page.url().split("/").at(-1) ?? "";
  expect(generatedPlanId).not.toBe(context.brewPlanId);
  await expect(page.getByText("Ratio 1:16 · fine", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit Plan" })).toBeVisible();

  const { data: sourcePlan, error: sourcePlanError } = await supabase
    .from("brew_plans")
    .select("coffee_id, coffee_dose, dial_in_thread_id, grind_level, ratio, recipe_template_id, recommendation_source, water_amount, water_temperature")
    .eq("id", context.brewPlanId)
    .single();
  expect(sourcePlanError).toBeNull();
  expect(sourcePlan).toMatchObject({
    coffee_dose: 15,
    grind_level: "medium-fine",
    ratio: 16,
    recommendation_source: "official_rule",
    water_amount: 240,
    water_temperature: 92,
  });

  const { data: generatedPlan, error: generatedPlanError } = await supabase
    .from("brew_plans")
    .select("based_on_session_id, coffee_id, coffee_dose, dial_in_thread_id, grind_level, parent_plan_id, ratio, recipe_template_id, recommendation_source, user_id, water_amount, water_temperature")
    .eq("id", generatedPlanId)
    .single();
  expect(generatedPlanError).toBeNull();
  expect(generatedPlan).toEqual({
    based_on_session_id: context.sessionId,
    coffee_dose: 15,
    coffee_id: context.coffeeId,
    dial_in_thread_id: context.threadId,
    grind_level: "fine",
    parent_plan_id: context.brewPlanId,
    ratio: 16,
    recipe_template_id: sourcePlan?.recipe_template_id,
    recommendation_source: "previous_brew_adjustment",
    user_id: owner.id,
    water_amount: 240,
    water_temperature: 92,
  });

  const { data: appliedDecision, error: appliedDecisionError } = await supabase
    .from("adjustment_decisions")
    .select("applied_brew_plan_id, id, status")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(appliedDecisionError).toBeNull();
  expect(appliedDecision).toMatchObject({ applied_brew_plan_id: generatedPlanId, status: "applied" });

  const { data: sourceSteps } = await supabase
    .from("brew_plan_steps")
    .select("duration, id, note, start_time, step_order, step_type, target_water")
    .eq("brew_plan_id", context.brewPlanId)
    .order("step_order");
  const { data: generatedSteps } = await supabase
    .from("brew_plan_steps")
    .select("duration, id, note, start_time, step_order, step_type, target_water")
    .eq("brew_plan_id", generatedPlanId)
    .order("step_order");
  const comparableSteps = (steps: typeof sourceSteps) => steps?.map((step) => ({
    duration: step.duration,
    note: step.note,
    start_time: step.start_time,
    step_order: step.step_order,
    step_type: step.step_type,
    target_water: step.target_water,
  }));
  expect(comparableSteps(generatedSteps)).toEqual(comparableSteps(sourceSteps));
  expect(generatedSteps?.every(({ id }) => !context.planStepIds.includes(id))).toBe(true);

  await page.goto(feedbackPath(context));
  await expect(page.getByRole("heading", { name: "Next brew ready" })).toBeVisible();
  const viewPlan = page.getByRole("link", { name: "View Brew Plan" });
  await expect(viewPlan).toHaveAttribute("href", `/brew/${generatedPlanId}`);

  const { data: retryPlanId, error: retryError } = await supabase.rpc("apply_adjustment_decision", {
    p_adjustment_decision_id: appliedDecision?.id ?? "",
    p_grind_level: "ignored-on-retry",
    p_magnitude_version: "ignored-on-retry",
    p_pour_targets: {},
    p_ratio: 1,
    p_water_amount: 1,
    p_water_temperature: 1,
  });
  expect(retryError).toBeNull();
  expect(retryPlanId).toBe(generatedPlanId);
  const { count: planCount } = await supabase
    .from("brew_plans")
    .select("id", { count: "exact", head: true })
    .eq("dial_in_thread_id", context.threadId);
  expect(planCount).toBe(2);
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

  await page.getByRole("button", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(/\/brew\/[0-9a-f-]+$/);
  const generatedPlanId = page.url().split("/").at(-1) ?? "";
  const { data: generatedPlan, error: generatedPlanError } = await supabase
    .from("brew_plans")
    .select("grind_level, recommendation_source, water_temperature")
    .eq("id", generatedPlanId)
    .single();
  expect(generatedPlanError).toBeNull();
  expect(generatedPlan).toEqual({
    grind_level: "medium-fine",
    recommendation_source: "previous_brew_adjustment",
    water_temperature: 93,
  });
});

test("Continue Dial-in applies a fixed-dose water adjustment and rescales Pour targets", async ({ page }) => {
  const context = await createBrewContext(owner);
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too weak", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByText("Use less water", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await page.getByRole("button", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(/\/brew\/[0-9a-f-]+$/);
  const generatedPlanId = page.url().split("/").at(-1) ?? "";

  const { data: generatedPlan, error: generatedPlanError } = await supabase
    .from("brew_plans")
    .select("coffee_dose, expected_flavor, grind_level, ratio, recipe_template_id, target_brew_time_max, target_brew_time_min, water_amount, water_temperature")
    .eq("id", generatedPlanId)
    .single();
  expect(generatedPlanError).toBeNull();
  expect(generatedPlan).toEqual({
    coffee_dose: 15,
    expected_flavor: "Sweet and clean",
    grind_level: "medium-fine",
    ratio: 15,
    recipe_template_id: "10000000-0000-4000-8000-000000000001",
    target_brew_time_max: 160,
    target_brew_time_min: 135,
    water_amount: 225,
    water_temperature: 92,
  });

  const { data: steps, error: stepsError } = await supabase
    .from("brew_plan_steps")
    .select("duration, note, start_time, step_order, step_type, target_water")
    .eq("brew_plan_id", generatedPlanId)
    .order("step_order");
  expect(stepsError).toBeNull();
  expect(steps).toEqual([
    { duration: 10, note: "First pour", start_time: 0, step_order: 1, step_type: "pour", target_water: 56.3 },
    { duration: 20, note: "Bloom wait", start_time: 10, step_order: 2, step_type: "wait", target_water: null },
    { duration: null, note: "Second pour", start_time: 30, step_order: 3, step_type: "pour", target_water: 112.5 },
    { duration: null, note: "Third pour", start_time: 60, step_order: 4, step_type: "pour", target_water: 168.8 },
    { duration: null, note: "Final pour", start_time: 90, step_order: 5, step_type: "pour", target_water: 225 },
  ]);

  const { data: sourcePlan } = await supabase
    .from("brew_plans")
    .select("coffee_dose, ratio, water_amount")
    .eq("id", context.brewPlanId)
    .single();
  expect(sourcePlan).toEqual({ coffee_dose: 15, ratio: 16, water_amount: 240 });
});

test("a grind boundary stays pending and shows a friendly non-applied result", async ({ page }) => {
  const context = await createBrewContext(owner, "completed", { grindLevel: "fine" });
  const supabase = await ownerClient();
  await signIn(page, owner);
  await page.goto(feedbackPath(context));

  await page.getByText("Too sour", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await page.getByRole("button", { name: "Continue Dial-in" }).click();

  await expect(page).toHaveURL(feedbackPath(context));
  await expect(page.getByText("This adjustment is already at Dialed’s supported limit.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue Dial-in" })).toBeDisabled();
  await expect(page.getByText("Increase water temperature", { exact: true })).toHaveCount(0);

  const { data: feedback } = await supabase
    .from("taste_feedback")
    .select("id")
    .eq("brew_session_id", context.sessionId)
    .single();
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("applied_brew_plan_id, status")
    .eq("taste_feedback_id", feedback?.id ?? "")
    .single();
  expect(decision).toEqual({ applied_brew_plan_id: null, status: "pending" });
  const { count: planCount } = await supabase
    .from("brew_plans")
    .select("id", { count: "exact", head: true })
    .eq("dial_in_thread_id", context.threadId);
  expect(planCount).toBe(1);
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
  await expect(page.getByRole("button", { name: "Continue Dial-in" })).toHaveCount(0);

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
  const mismatched = await createBrewContext(owner, "completed");
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
  await page.goto(`/brew/${completed.brewPlanId}/session/${mismatched.sessionId}/feedback`);
  await expect(page.getByRole("heading", { name: "Brew Plan not found" })).toBeVisible();
  await page.goto(feedbackPath(completed));
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
});
