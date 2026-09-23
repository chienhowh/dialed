import { expect, test, type Page } from "@playwright/test";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

let user: TestUser;

async function initiateGoogleOAuth(page: Page): Promise<URL> {
  let authorizeUrl: URL | undefined;
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ body: "OAuth intercepted for test", contentType: "text/plain" });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authorizeUrl?.searchParams.get("provider")).toBe("google");

  if (!authorizeUrl) throw new Error("Google OAuth authorize request was not observed.");
  return authorizeUrl;
}

function getBaseUrl(baseURL: string | undefined): string {
  if (!baseURL) throw new Error("Playwright baseURL must be configured.");
  return baseURL;
}

test.beforeAll(async () => {
  user = await createTestUser("auth");
});

test.afterAll(async () => {
  await deleteTestUser(user);
});

test("shows Google OAuth as the only beta authentication option", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
});

test("ignores arbitrary login error values", async ({ page }) => {
  await page.goto("/login?error=unexpected");

  await expect(
    page.getByText("We could not complete Google sign-in. Please try again."),
  ).toHaveCount(0);
});

test("initiates the Google provider with the configured callback URL", async ({
  baseURL,
  page,
}) => {
  const authorizeUrl = await initiateGoogleOAuth(page);

  expect(authorizeUrl?.searchParams.get("redirect_to")).toBe(
    new URL("/auth/callback", getBaseUrl(baseURL)).toString(),
  );
});

test("handles an invalid callback code through the real local Supabase client", async ({
  baseURL,
  page,
}) => {
  await initiateGoogleOAuth(page);

  const verifierCookies = (await page.context().cookies()).filter(({ name }) =>
    name.includes("code-verifier"),
  );
  expect(verifierCookies.length).toBeGreaterThan(0);

  await page.goto(
    new URL("/auth/callback?code=bogus", getBaseUrl(baseURL)).toString(),
  );

  await expect(page).toHaveURL(
    new URL("/login?error=oauth_callback", getBaseUrl(baseURL)).toString(),
  );
  await expect(
    page.getByText("We could not complete Google sign-in. Please try again."),
  ).toBeVisible();
});

test("disables the Google button while OAuth initiation is pending", async ({ page }) => {
  let releaseRequest: (() => void) | undefined;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await requestReleased;
    await route.abort();
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const pendingButton = page.getByRole("button", { name: "Connecting to Google…" });
  await expect(pendingButton).toBeDisabled();
  releaseRequest?.();
});

test("protects authenticated routes and signs out the Dialed session", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");

  await signIn(page, user);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  const authCookies = (await page.context().cookies()).filter(({ name }) =>
    name.includes("auth-token"),
  );
  expect(authCookies.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
