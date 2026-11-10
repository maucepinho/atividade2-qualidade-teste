import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-atividade",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/atividade",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/atividade", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:18081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
