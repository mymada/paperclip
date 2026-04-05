import { test, expect } from "@playwright/test";

/**
 * E2E: current onboarding flow.
 *
 * Walks through the current wizard:
 *   Front door -> company name -> mission -> CEO setup -> launch to board chat.
 *
 * The wizard now creates a planning issue for the CEO and redirects to
 * board chat instead of creating and opening a user-authored issue directly.
 */

const COMPANY_NAME = `E2E-Test-${Date.now()}`;
const AGENT_NAME = "CEO";
const COMPANY_MISSION = "Build the best AI operations company for technical teams.";
const WORKING_DIRECTORY = "/tmp/paperclip-e2e-onboarding";

test.describe("Onboarding wizard", () => {
  test("completes full wizard flow", async ({ page }) => {
    await page.goto("/");

    const wizardHeading = page.locator("h3", { hasText: "Name your company" });
    const newCompanyBtn = page.getByRole("button", { name: "New Company" });
    const createCompanyBtn = page.getByRole("button", { name: /Create a new company/i });

    await expect(
      wizardHeading.or(newCompanyBtn).or(createCompanyBtn)
    ).toBeVisible({ timeout: 15_000 });

    if (await newCompanyBtn.isVisible()) {
      await newCompanyBtn.click();
    }

    if (await createCompanyBtn.isVisible()) {
      await createCompanyBtn.click();
    }

    await expect(wizardHeading).toBeVisible({ timeout: 5_000 });

    const companyNameInput = page.locator('input[placeholder="Acme Corp"]');
    await companyNameInput.fill(COMPANY_NAME);

    const nextButton = page.getByRole("button", { name: "Next" });
    await nextButton.click();

    await expect(
      page.locator("h3", { hasText: "Define your mission" })
    ).toBeVisible({ timeout: 10_000 });

    await page.locator('textarea[placeholder="What is this company trying to achieve?"]').fill(COMPANY_MISSION);
    await page.getByRole("button", { name: "Confirm mission" }).click();

    const agentNameInput = page.locator('input[placeholder="CEO"]');
    await expect(
      page.locator("h3", { hasText: "Bring your CEO to life" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(agentNameInput).toHaveValue(AGENT_NAME);

    await page.getByRole("button", { name: "Gemini CLI" }).click();
    await page.locator('input[placeholder="/path/to/project"]').fill(WORKING_DIRECTORY);
    await page.getByRole("button", { name: "Give it a heartbeat" }).click();

    await expect(
      page.getByRole("button", { name: "Launch company" })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("text=" + COMPANY_NAME)).toBeVisible();
    await expect(page.locator("text=" + AGENT_NAME)).toBeVisible();
    await expect(page.locator("text=" + COMPANY_MISSION)).toBeVisible();

    await page.getByRole("button", { name: "Launch company" }).click();
    await expect(page).toHaveURL(/\/board-chat/, { timeout: 10_000 });

    const baseUrl = page.url().split("/").slice(0, 3).join("/");

    const companiesRes = await page.request.get(`${baseUrl}/api/companies`);
    expect(companiesRes.ok()).toBe(true);
    const companies = await companiesRes.json();
    const company = companies.find(
      (c: { name: string }) => c.name === COMPANY_NAME
    );
    expect(company).toBeTruthy();

    const agentsRes = await page.request.get(
      `${baseUrl}/api/companies/${company.id}/agents`
    );
    expect(agentsRes.ok()).toBe(true);
    const agents = await agentsRes.json();
    const ceoAgent = agents.find(
      (a: { name: string }) => a.name === AGENT_NAME
    );
    expect(ceoAgent).toBeTruthy();
    expect(ceoAgent.role).toBe("ceo");
    expect(ceoAgent.adapterType).toBe("gemini_local");

    const issuesRes = await page.request.get(
      `${baseUrl}/api/companies/${company.id}/issues`
    );
    expect(issuesRes.ok()).toBe(true);
    const issues = await issuesRes.json();
    const task = issues.find(
      (i: { title: string }) => i.title === "Strategy & hiring plan with CEO"
    );
    expect(task).toBeTruthy();
    expect(task.assigneeAgentId).toBeNull();
    expect(task.status).toBe("backlog");
  });
});
