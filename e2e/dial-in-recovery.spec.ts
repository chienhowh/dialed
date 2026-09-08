import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { listDialInThreadSummaries, listDialInThreadSummariesForCoffee } from "../src/features/dial-in-history/repository";
import type { Database } from "../src/types/database";
import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

type TestClient = SupabaseClient<Database>;

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

async function authenticatedClient(user: TestUser) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword(user);
  expect(error).toBeNull();
  return supabase;
}

async function createCoffee(admin: TestClient, user: TestUser, name: string) {
  const beanProfileId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const { error: beanError } = await admin.from("bean_profiles").insert({
    id: beanProfileId,
    origin_country_code: "ET",
    process: "washed",
    region: "Guji",
    roast_level: "light",
    user_id: user.id,
  });
  expect(beanError).toBeNull();
  const { error: coffeeError } = await admin.from("coffees").insert({
    bean_profile_id: beanProfileId,
    id: coffeeId,
    product_name: name,
    user_id: user.id,
  });
  expect(coffeeError).toBeNull();
  return coffeeId;
}

async function createThread(admin: TestClient, user: TestUser, coffeeId: string, secondaryGoal: "clean" | null = null) {
  const threadId = crypto.randomUUID();
  const { error } = await admin.from("dial_in_threads").insert({
    coffee_id: coffeeId,
    id: threadId,
    primary_taste_goal: "bright",
    secondary_taste_goal: secondaryGoal,
    user_id: user.id,
  });
  expect(error).toBeNull();
  return threadId;
}

async function createPlan(
  admin: TestClient,
  user: TestUser,
  coffeeId: string,
  threadId: string,
  options: {
    basedOnSessionId?: string;
    parentPlanId?: string;
    recipeTemplateId?: string;
    source?: "manual" | "official_rule" | "previous_brew_adjustment";
  } = {},
) {
  const planId = crypto.randomUUID();
  const { error: planError } = await admin.from("brew_plans").insert({
    based_on_session_id: options.basedOnSessionId,
    coffee_dose: 15,
    coffee_id: coffeeId,
    dial_in_thread_id: threadId,
    expected_flavor: "Bright and clean",
    grind_level: options.source === "official_rule" || options.source === undefined ? "medium-fine" : "fine",
    id: planId,
    parent_plan_id: options.parentPlanId,
    ratio: 16,
    recommendation_reason: "M8.1 recovery fixture",
    recommendation_source: options.source ?? "official_rule",
    recipe_template_id: options.recipeTemplateId,
    target_brew_time_max: 180,
    target_brew_time_min: 150,
    user_id: user.id,
    water_amount: 240,
    water_temperature: 92,
  });
  expect(planError).toBeNull();
  const { error: stepError } = await admin.from("brew_plan_steps").insert([
    {
      brew_plan_id: planId,
      duration: 30,
      note: "Bloom",
      start_time: 0,
      step_order: 1,
      step_type: "pour",
      target_water: 60,
    },
    {
      brew_plan_id: planId,
      duration: 30,
      note: "Wait",
      start_time: 30,
      step_order: 2,
      step_type: "wait",
      target_water: null,
    },
    {
      brew_plan_id: planId,
      note: "Final pour",
      start_time: 60,
      step_order: 3,
      step_type: "pour",
      target_water: 240,
    },
  ]);
  expect(stepError).toBeNull();
  return planId;
}

async function createCompletedSession(
  admin: TestClient,
  user: TestUser,
  planId: string,
  startedAt = new Date(Date.now() - 180_000).toISOString(),
) {
  const sessionId = crypto.randomUUID();
  const { error } = await admin.from("brew_sessions").insert({
    actual_brew_time: 165,
    brew_plan_id: planId,
    finished_at: new Date(Date.parse(startedAt) + 165_000).toISOString(),
    id: sessionId,
    started_at: startedAt,
    status: "completed",
    user_id: user.id,
  });
  expect(error).toBeNull();
  return sessionId;
}

async function createFeedback(
  admin: TestClient,
  user: TestUser,
  sessionId: string,
  options: { prettyGood?: boolean; rating?: number } = {},
) {
  const feedbackId = crypto.randomUUID();
  const { error } = await admin.from("taste_feedback").insert({
    brew_session_id: sessionId,
    id: feedbackId,
    overall_rating: options.rating ?? 3,
    pretty_good: options.prettyGood ?? false,
    too_sour: !options.prettyGood,
    user_id: user.id,
  });
  expect(error).toBeNull();
  return feedbackId;
}

async function createHeldDecision(admin: TestClient, user: TestUser, feedbackId: string) {
  const decisionId = crypto.randomUUID();
  const { error } = await admin.from("adjustment_decisions").insert({
    candidate_knowledge_version: null,
    id: decisionId,
    inferred_directions: ["hold"],
    interpretation_version: "feedback-interpretation-v1",
    recommended_candidate: null,
    selected_candidate: null,
    selected_direction: "hold",
    status: "held",
    taste_feedback_id: feedbackId,
    user_id: user.id,
  });
  expect(error).toBeNull();
  return decisionId;
}

const grindCandidate = {
  changeDirection: "finer",
  evidenceClassification: "product_heuristic",
  parameter: "grind",
  reason: "Increase extraction with one controlled change.",
} as const;

async function createDecision(
  admin: TestClient,
  user: TestUser,
  feedbackId: string,
  options: { appliedPlanId?: string } = {},
) {
  const decisionId = crypto.randomUUID();
  const { error } = await admin.from("adjustment_decisions").insert({
    applied_brew_plan_id: options.appliedPlanId,
    candidate_knowledge_version: "candidate-catalog-v1",
    id: decisionId,
    inferred_directions: ["increase_extraction"],
    interpretation_version: "feedback-interpretation-v1",
    recommended_candidate: grindCandidate,
    selected_candidate: grindCandidate,
    selected_direction: "increase_extraction",
    status: options.appliedPlanId ? "applied" : "pending",
    taste_feedback_id: feedbackId,
    user_id: user.id,
  });
  expect(error).toBeNull();
  return decisionId;
}

async function createPendingContext(name: string) {
  const admin = client(true);
  const coffeeId = await createCoffee(admin, owner, name);
  const threadId = await createThread(admin, owner, coffeeId, "clean");
  const planId = await createPlan(admin, owner, coffeeId, threadId);
  const sessionId = await createCompletedSession(admin, owner, planId);
  const feedbackId = await createFeedback(admin, owner, sessionId);
  await createDecision(admin, owner, feedbackId);
  return { coffeeId, feedbackId, planId, sessionId, threadId };
}

test.beforeAll(async () => {
  [owner, otherUser] = await Promise.all([
    createTestUser("dial-in-recovery-owner"),
    createTestUser("dial-in-recovery-other"),
  ]);
});

test.afterAll(async () => {
  await Promise.all([deleteTestUser(owner), deleteTestUser(otherUser)]);
});

test("recovers a pending Decision from Coffee Detail and later reuses its applied Plan", async ({ page }) => {
  const context = await createPendingContext("Recovery Pending Coffee");
  const supabase = await authenticatedClient(owner);
  await signIn(page, owner);

  await page.goto(`/brew/${context.planId}/session/${context.sessionId}/feedback`);
  await expect(page.getByRole("heading", { name: "Adjustment saved" })).toBeVisible();
  await page.goto(`/history?coffee=${context.coffeeId}`);
  await expect(page.getByRole("heading", { name: "Brew History" })).toBeVisible();
  await expect(page.getByText("Bright + Clean", { exact: true })).toBeVisible();
  await expect(page.getByText("Too sour", { exact: true })).toBeVisible();
  const { data: decisionBeforeHistoryAction } = await supabase
    .from("adjustment_decisions")
    .select("applied_brew_plan_id, status")
    .eq("taste_feedback_id", context.feedbackId)
    .single();
  expect(decisionBeforeHistoryAction).toEqual({ applied_brew_plan_id: null, status: "pending" });
  await page.getByRole("link", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(`/brew/${context.planId}/session/${context.sessionId}/feedback`);
  await page.getByRole("button", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(/\/brew\/[0-9a-f-]+$/);
  const generatedPlanId = page.url().split("/").at(-1) ?? "";

  await page.goto(`/history?coffee=${context.coffeeId}`);
  const reviewNextBrew = page.getByRole("link", { name: "Review Next Brew" });
  await expect(reviewNextBrew).toHaveAttribute("href", `/brew/${generatedPlanId}`);
  const { count: beforeReview } = await supabase
    .from("brew_plans")
    .select("id", { count: "exact", head: true })
    .eq("dial_in_thread_id", context.threadId);
  await reviewNextBrew.click();
  await expect(page).toHaveURL(`/brew/${generatedPlanId}`);
  const { count: afterReview } = await supabase
    .from("brew_plans")
    .select("id", { count: "exact", head: true })
    .eq("dial_in_thread_id", context.threadId);
  expect({ afterReview, beforeReview }).toEqual({ afterReview: 2, beforeReview: 2 });
});

test("recovers a completed Session that still needs Feedback", async ({ page }) => {
  const admin = client(true);
  const coffeeId = await createCoffee(admin, owner, "Recovery Feedback Coffee");
  const threadId = await createThread(admin, owner, coffeeId);
  const planId = await createPlan(admin, owner, coffeeId, threadId);
  const sessionId = await createCompletedSession(admin, owner, planId);
  await signIn(page, owner);

  await page.goto(`/history?coffee=${coffeeId}`);
  await expect(page.getByRole("heading", { name: "Brew #1" })).toBeVisible();
  await page.getByRole("link", { name: "Give Feedback" }).click();
  await expect(page).toHaveURL(`/brew/${planId}/session/${sessionId}/feedback`);
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
  const { count } = await admin
    .from("taste_feedback")
    .select("id", { count: "exact", head: true })
    .eq("brew_session_id", sessionId);
  expect(count).toBe(0);
});

test("shows a compact Home shortcut without mutating the pending Decision", async ({ page }) => {
  const context = await createPendingContext("Home Recovery Coffee");
  const supabase = await authenticatedClient(owner);
  await signIn(page, owner);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Continue Dial-in" })).toBeVisible();
  const card = page.locator("article").filter({ hasText: "Home Recovery Coffee" });
  await expect(card.getByText("Bright + Clean", { exact: true })).toBeVisible();
  await expect(card.getByText("Adjustment ready to apply", { exact: true })).toBeVisible();
  await card.getByRole("link", { name: "Continue Dial-in" }).click();
  await expect(page).toHaveURL(`/brew/${context.planId}/session/${context.sessionId}/feedback`);
  const { data: decision } = await supabase
    .from("adjustment_decisions")
    .select("applied_brew_plan_id, status")
    .eq("taste_feedback_id", context.feedbackId)
    .single();
  expect(decision).toEqual({ applied_brew_plan_id: null, status: "pending" });
});

test("shows a chronological Coffee and Thread timeline with applied and held Decisions", async ({ page }) => {
  const admin = client(true);
  const { data: recipeTemplate, error: recipeTemplateError } = await admin
    .from("recipe_templates")
    .select("id, name")
    .eq("name", "Three Pour")
    .single();
  expect(recipeTemplateError).toBeNull();
  const coffeeId = await createCoffee(admin, owner, "History Timeline Coffee");
  const threadId = await createThread(admin, owner, coffeeId, "clean");
  const firstPlanId = await createPlan(admin, owner, coffeeId, threadId, { recipeTemplateId: recipeTemplate?.id });
  const firstSessionId = await createCompletedSession(admin, owner, firstPlanId, "2026-08-10T10:00:00.000Z");
  const firstFeedbackId = await createFeedback(admin, owner, firstSessionId);
  const nextPlanId = await createPlan(admin, owner, coffeeId, threadId, {
    basedOnSessionId: firstSessionId,
    parentPlanId: firstPlanId,
    recipeTemplateId: recipeTemplate?.id,
    source: "previous_brew_adjustment",
  });
  await createDecision(admin, owner, firstFeedbackId, { appliedPlanId: nextPlanId });
  const secondSessionId = await createCompletedSession(admin, owner, nextPlanId, "2026-08-11T10:00:00.000Z");
  const secondFeedbackId = await createFeedback(admin, owner, secondSessionId, { prettyGood: true, rating: 5 });
  await createHeldDecision(admin, owner, secondFeedbackId);
  await signIn(page, owner);

  await page.goto(`/history?coffee=${coffeeId}`);
  await expect(page.getByRole("heading", { name: "History Timeline Coffee" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bright + Clean" })).toBeVisible();
  const attempts = page.getByRole("heading", { name: /^Brew #\d+$/ });
  await expect(attempts).toHaveCount(2);
  await expect(attempts.nth(0)).toHaveText("Brew #1");
  await expect(attempts.nth(1)).toHaveText("Brew #2");

  const firstAttempt = page.locator("article").filter({ has: page.getByRole("heading", { name: "Brew #1" }) });
  await expect(firstAttempt.getByText("Three Pour", { exact: true })).toBeVisible();
  await expect(firstAttempt.getByText("Too sour", { exact: true })).toBeVisible();
  await expect(firstAttempt.getByText("Dialed suggested:")).toContainText("Dialed suggested:");
  await expect(firstAttempt.getByText("You chose:")).toContainText("You chose:");
  await expect(firstAttempt.getByText("Next Brew Plan created", { exact: true })).toBeVisible();
  await expect(firstAttempt.getByRole("link", { name: "View Next Brew Plan" })).toHaveAttribute("href", `/brew/${nextPlanId}`);

  const secondAttempt = page.locator("article").filter({ has: page.getByRole("heading", { name: "Brew #2" }) });
  await expect(secondAttempt.getByText("Pretty good", { exact: true })).toBeVisible();
  await expect(secondAttempt.getByText("Dialed in", { exact: true })).toBeVisible();
  await expect(secondAttempt.getByText("Keep this brew unchanged.", { exact: true })).toBeVisible();
});

test("Brew Again reuses one Plan and creates a distinct Session", async ({ page }) => {
  const admin = client(true);
  const coffeeId = await createCoffee(admin, owner, "Brew Again Coffee");
  const threadId = await createThread(admin, owner, coffeeId);
  const planId = await createPlan(admin, owner, coffeeId, threadId);
  const firstSessionId = await createCompletedSession(admin, owner, planId);
  const feedbackId = await createFeedback(admin, owner, firstSessionId, { prettyGood: true, rating: 5 });
  await createHeldDecision(admin, owner, feedbackId);
  const ownerSupabase = await authenticatedClient(owner);
  await signIn(page, owner);

  await page.goto(`/history?coffee=${coffeeId}`);
  const brewAgain = page.getByRole("link", { name: "Brew Again" });
  await expect(brewAgain).toHaveAttribute("href", `/brew/${planId}`);
  await brewAgain.click();
  await expect(page).toHaveURL(`/brew/${planId}`);
  await page.getByRole("link", { name: "Start Brewing" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();

  await expect.poll(async () => {
    const { count } = await ownerSupabase
      .from("brew_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brew_plan_id", planId);
    return count;
  }).toBe(2);
  const { data: sessions } = await ownerSupabase
    .from("brew_sessions")
    .select("id, brew_plan_id")
    .eq("brew_plan_id", planId);
  expect(new Set(sessions?.map(({ id }) => id)).size).toBe(2);
  expect(sessions?.every(({ brew_plan_id }) => brew_plan_id === planId)).toBe(true);
  expect(sessions?.some(({ id }) => id === firstSessionId)).toBe(true);
  const { count: planCount } = await ownerSupabase
    .from("brew_plans")
    .select("id", { count: "exact", head: true })
    .eq("dial_in_thread_id", threadId);
  expect(planCount).toBe(1);

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish Brew" }).click();
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
  await page.goto(`/history?coffee=${coffeeId}`);
  await expect(page.getByRole("heading", { name: /^Brew #\d+$/ })).toHaveCount(2);
  await expect(page.getByText("Same plan as previous brew", { exact: true })).toBeVisible();
});

test("bulk repository and Coffee Detail preserve same-goal Threads, repeated Plans, and actionable branches", async ({ page }) => {
  const admin = client(true);
  const coffeeId = await createCoffee(admin, owner, "Branching Recovery Coffee");
  const threadId = await createThread(admin, owner, coffeeId);
  const parentPlanId = await createPlan(admin, owner, coffeeId, threadId);
  const sessionA = await createCompletedSession(admin, owner, parentPlanId, "2026-08-01T10:00:00.000Z");
  const sessionB = await createCompletedSession(admin, owner, parentPlanId, "2026-08-02T10:00:00.000Z");
  const feedbackA = await createFeedback(admin, owner, sessionA);
  const feedbackB = await createFeedback(admin, owner, sessionB);
  const childA = await createPlan(admin, owner, coffeeId, threadId, {
    basedOnSessionId: sessionA,
    parentPlanId,
    source: "manual",
  });
  const childB = await createPlan(admin, owner, coffeeId, threadId, {
    basedOnSessionId: sessionB,
    parentPlanId,
    source: "previous_brew_adjustment",
  });
  await createDecision(admin, owner, feedbackA, { appliedPlanId: childA });
  await createDecision(admin, owner, feedbackB, { appliedPlanId: childB });
  const childSession = await createCompletedSession(admin, owner, childA, "2026-08-03T10:00:00.000Z");

  const secondThreadId = await createThread(admin, owner, coffeeId);
  const secondThreadPlanId = await createPlan(admin, owner, coffeeId, secondThreadId);
  const otherCoffeeId = await createCoffee(admin, otherUser, "Private Other Coffee");
  const otherThreadId = await createThread(admin, otherUser, otherCoffeeId);
  await createPlan(admin, otherUser, otherCoffeeId, otherThreadId);

  const ownerSupabase = await authenticatedClient(owner);
  const [allSummaries, coffeeSummaries] = await Promise.all([
    listDialInThreadSummaries(ownerSupabase, owner.id),
    listDialInThreadSummariesForCoffee(ownerSupabase, owner.id, coffeeId),
  ]);
  expect(allSummaries.some(({ coffeeName }) => coffeeName === "Private Other Coffee")).toBe(false);
  expect(coffeeSummaries).toHaveLength(2);
  expect(coffeeSummaries.every(({ primaryTasteGoal }) => primaryTasteGoal === "bright")).toBe(true);
  const branchingThread = coffeeSummaries.find((summary) => summary.threadId === threadId);
  expect(branchingThread?.attempts).toHaveLength(3);
  expect(branchingThread?.attempts.filter(({ plan }) => plan.id === parentPlanId)).toHaveLength(2);
  expect(new Map(branchingThread?.attempts.map(({ generatedNextPlanId, sessionId }) => [sessionId, generatedNextPlanId]))).toEqual(new Map([
    [sessionA, childA],
    [sessionB, childB],
    [childSession, null],
  ]));
  expect(branchingThread?.actionableItems.map(({ kind, planId }) => [kind, planId])).toEqual([
    ["needs_feedback", childA],
    ["next_plan_ready", childB],
  ]);
  expect(coffeeSummaries.find(({ threadId: id }) => id === secondThreadId)?.actionableItems[0]).toMatchObject({
    kind: "ready_to_brew",
    planId: secondThreadPlanId,
  });

  await signIn(page, owner);
  await page.goto(`/coffee/${coffeeId}`);
  await expect(page.getByRole("heading", { name: "Bright", exact: true })).toHaveCount(2);
  const branchCard = page.locator("article").filter({ hasText: "3 completed brews" });
  await expect(branchCard.getByRole("link", { name: "Give Feedback" })).toHaveAttribute(
    "href",
    `/brew/${childA}/session/${childSession}/feedback`,
  );
  await branchCard.getByText("1 more item needs attention", { exact: true }).click();
  await expect(branchCard.getByRole("link", { name: "Review Next Brew" })).toHaveAttribute("href", `/brew/${childB}`);

  await page.goto(`/history?coffee=${coffeeId}`);
  await expect(page.getByText("Private Other Coffee")).toHaveCount(0);
  const historyAttempts = page.getByRole("heading", { name: /^Brew #\d+$/ });
  await expect(historyAttempts).toHaveCount(3);
  const firstAttempt = page.locator("article").filter({ has: page.getByRole("heading", { name: "Brew #1" }) });
  const secondAttempt = page.locator("article").filter({ has: page.getByRole("heading", { name: "Brew #2" }) });
  await expect(firstAttempt.getByRole("link", { name: "View Next Brew Plan" })).toHaveAttribute("href", `/brew/${childA}`);
  await expect(secondAttempt.getByRole("link", { name: "View Next Brew Plan" })).toHaveAttribute("href", `/brew/${childB}`);
  await expect(firstAttempt.getByText("Adjusted plan was edited before brewing", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review Next Brew" })).toHaveAttribute("href", `/brew/${childB}`);
});
