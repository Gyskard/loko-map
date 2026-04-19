// Some functional tests which check only the panels and not the globe
// because I didn't want the pain of doing E2E tests with CesiumJS...

import { test, expect, type Page } from "@playwright/test";

// Empty object so the app loads without the waiting the API
const EMPTY_FC = JSON.stringify({ type: "FeatureCollection", features: [] });

const EMPTY_STATS = JSON.stringify({
  lines: [],
  oldLines: [],
  stations: [],
  oldStations: [],
});

const mockApi = async (page: Page) => {
  await page.route("/api/data/**", (route) =>
    route.fulfill({ body: EMPTY_FC, contentType: "application/json" }),
  );

  await page.route("/api/stats", (route) =>
    route.fulfill({ body: EMPTY_STATS, contentType: "application/json" }),
  );
};

// Set app to english before each test
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "en"));
  await mockApi(page);
  await page.goto("/");
});

test("page has correct title", async ({ page }) => {
  await expect(page).toHaveTitle(/Loko Map/);
});

test("control panel is visible on load", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Loko-map" })).toBeVisible();
});

test("stats panel is visible on load", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Statistics" })).toBeVisible();
});

test("active stations toggle starts enabled", async ({ page }) => {
  const toggle = page.getByRole("switch", { name: "Active stations & lines" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
});

test("clicking active stations toggle disables it", async ({ page }) => {
  const toggle = page.getByRole("switch", { name: "Active stations & lines" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("stats panel can be toggled off", async ({ page }) => {
  await page.getByRole("switch", { name: "Statistics" }).click();
  await expect(
    page.getByRole("region", { name: "Statistics" }),
  ).not.toBeVisible();
});

test("shows error banner when data fetch fails", async ({ page, context }) => {
  await context.unroute("/api/data/**");
  await page.route("/api/data/**", (route) => route.fulfill({ status: 500 }));
  await page.reload();
  await expect(page.getByText(/Some map data failed to load/i)).toBeVisible();
});

test("language switcher changes UI language", async ({ page }) => {
  await expect(page.getByText("Displayed data")).toBeVisible();
  await page.getByRole("button", { name: "FR" }).click();
  await expect(page.getByText("Données affichées")).toBeVisible();
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByText("Displayed data")).toBeVisible();
});
