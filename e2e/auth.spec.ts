import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const email = `auth-${crypto.randomUUID()}@example.com`;
const password = "Dialed-test-password-2026";
let userId: string;

test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Local Supabase integration-test environment is missing.");
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });

  if (error) {
    throw error;
  }

  userId = data.user.id;
});

test.afterAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || !userId) {
    return;
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.auth.admin.deleteUser(userId);
});

test("creates and preserves a cookie-based email session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  const authCookies = (await page.context().cookies()).filter(({ name }) => name.includes("auth-token"));
  expect(authCookies.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
});
