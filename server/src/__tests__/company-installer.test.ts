/**
 * [DATA_BUS] : Source: CompanyInstaller, Vitest.
 * [LOGIC_REPORT] : Tests the Universal Importer by mocking git clone and 
 * verifying that the portability service is called correctly.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { companyInstaller } from "../services/company-installer.js";
import { runChildProcess } from "../adapters/utils.js";
import { companyPortabilityService } from "../services/company-portability.js";

vi.mock("../adapters/utils.js", () => ({
  runChildProcess: vi.fn().mockResolvedValue({ exitCode: 0 }),
}));

vi.mock("../services/company-portability.js", () => ({
  companyPortabilityService: vi.fn().mockImplementation(() => ({
    importBundle: vi.fn().mockResolvedValue({
      company: { id: "new-comp-123", name: "Mock Company" },
      agents: [],
    }),
  })),
}));

describe("CompanyInstaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should attempt to install a company from a repo", async () => {
    // Mocking fs and path would be too complex here, 
    // so we just test the high-level orchestration if possible.
    // In a real scenario, scanDirectory would fail on a mocked tmp dir.
    
    // We'll mock scanDirectory for this test
    // @ts-ignore
    const scanSpy = vi.spyOn(companyInstaller, "scanDirectory").mockResolvedValue({
      "COMPANY.md": "# Mock Company\n",
    });

    const result = await companyInstaller.installFromRepo({} as any, undefined, {
      repoUrl: "https://github.com/test/repo",
      newCompanyName: "Test Company",
    });

    expect(runChildProcess).toHaveBeenCalled();
    expect(companyPortabilityService).toHaveBeenCalled();
    expect(result.company.id).toBe("new-comp-123");
    
    scanSpy.mockRestore();
  });
});
