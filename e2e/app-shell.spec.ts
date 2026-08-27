import { expect, test } from "@playwright/test";

test("renders the mobile shell and navigates between primary destinations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What are you brewing today?" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  await page.getByRole("link", { name: "Coffee", exact: true }).click();
  await expect(page).toHaveURL(/\/coffee$/);
  await expect(page.getByRole("heading", { name: "My Coffee" })).toBeVisible();

  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole("heading", { name: "Brew History" })).toBeVisible();
});

test("exposes the basic PWA assets", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "Dialed Coffee Brewing Assistant",
    display: "standalone",
    start_url: "/",
  });

  const serviceWorkerResponse = await request.get("/sw.js");
  expect(serviceWorkerResponse.ok()).toBe(true);
  expect(serviceWorkerResponse.headers()["content-type"]).toContain("application/javascript");
});

test("registers the service worker in the production shell", async ({ page }) => {
  await page.goto("/");

  const scriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });

  expect(scriptUrl).toBe("http://localhost:3000/sw.js");
});
