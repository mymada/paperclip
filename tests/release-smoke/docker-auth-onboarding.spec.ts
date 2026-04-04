import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL =
  process.env.PAPERCLIP_RELEASE_SMOKE_EMAIL ??
  process.env.SMOKE_ADMIN_EMAIL ??
  "smoke-admin@paperclip.local";
const ADMIN_PASSWORD =
  process.env.PAPERCLIP_RELEASE_SMOKE_PASSWORD ??
  process.env.SMOKE_ADMIN_PASSWORD ??
  "paperclip-smoke-password";

const COMPANY_NAME = `Release-Smoke-${Date.now()}`;
const AGENT_NAME = "CEO";
const COMPANY_MISSION = "Build an AI-native operating system for modern teams.";
const WORKING_DIRECTORY = "/tmp/paperclip-release-smoke";

async function signIn(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth/);

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
}

async function openOnboarding(page: Page) {
  const wizardHeading = page.locator("h3", { hasText: "Name your company" });
  const startButton = page.getByRole("button", { name: "Start Onboarding" });
  const createCompanyBtn = page.getByRole("button", { name: /Create a new company/i });

  await expect(wizardHeading.or(startButton).or(createCompanyBtn)).toBeVisible({ timeout: 20_000 });

  if (await startButton.isVisible()) {
    await startButton.click();
  }

  if (await createCompanyBtn.isVisible()) {
    await createCompanyBtn.click();
  }

  await expect(wizardHeading).toBeVisible({ timeout: 10_000 });
}

test.describe("Docker authenticated onboarding smoke", () => {
  test("logs in and completes the current onboarding flow", async ({
    page,
  }) => {
    await signIn(page);
    await openOnboarding(page);

    await page.locator('input[placeholder="Acme Corp"]').fill(COMPANY_NAME);
    await page.getByRole("button", { name: "Next" }).click();

    await expect(
      page.locator("h3", { hasText: "Define your mission" })
    ).toBeVisible({ timeout: 10_000 });

    await page
      .locator('textarea[placeholder="What is this company trying to achieve?"]')
      .fill(COMPANY_MISSION);
    await page.getByRole("button", { name: "Confirm mission" }).click();

    await expect(page.locator('input[placeholder="CEO"]')).toHaveValue(AGENT_NAME);
    await expect(
      page.locator("h3", { hasText: "Bring your CEO to life" })
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Gemini CLI" }).click();
    await page.locator('input[placeholder="/path/to/project"]').fill(WORKING_DIRECTORY);
    await page.getByRole("button", { name: "Give it a heartbeat" }).click();

    await expect(
      page.getByRole("button", { name: "Launch company" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(COMPANY_NAME)).toBeVisible();
    await expect(page.getByText(AGENT_NAME)).toBeVisible();
    await expect(page.getByText(COMPANY_MISSION)).toBeVisible();

    await page.getByRole("button", { name: "Launch company" }).click();
    await expect(page).toHaveURL(/\/board-chat/, { timeout: 10_000 });

    const baseUrl = new URL(page.url()).origin;

    const companiesRes = await page.request.get(`${baseUrl}/api/companies`);
    expect(companiesRes.ok()).toBe(true);
    const companies = (await companiesRes.json()) as Array<{ id: string; name: string }>;
    const company = companies.find((entry) => entry.name === COMPANY_NAME);
    expect(company).toBeTruthy();

    const agentsRes = await page.request.get(
      `${baseUrl}/api/companies/${company!.id}/agents`
    );
    expect(agentsRes.ok()).toBe(true);
    const agents = (await agentsRes.json()) as Array<{
      id: string;
      name: string;
      role: string;
      adapterType: string;
    }>;
    const ceoAgent = agents.find((entry) => entry.name === AGENT_NAME);
    expect(ceoAgent).toBeTruthy();
    expect(ceoAgent!.role).toBe("ceo");
    expect(ceoAgent!.adapterType).toBe("gemini_local");

    const issuesRes = await page.request.get(
      `${baseUrl}/api/companies/${company!.id}/issues`
    );
    expect(issuesRes.ok()).toBe(true);
    const issues = (await issuesRes.json()) as Array<{
      id: string;
      title: string;
      status: string;
      assigneeAgentId: string | null;
    }>;
    const issue = issues.find((entry) => entry.title === "Strategy & hiring plan with CEO");
    expect(issue).toBeTruthy();
    expect(issue!.assigneeAgentId).toBeNull();
    expect(issue!.status).toBe("backlog");
  });
});
