import { describe, expect, it } from "vitest";
import {
  applyCompanyPrefix,
  extractCompanyPrefixFromPath,
  isBoardPathWithoutPrefix,
  toCompanyRelativePath,
} from "./company-routes";

describe("company routes", () => {
  it("treats execution workspace paths as board routes that need a company prefix", () => {
    expect(isBoardPathWithoutPrefix("/execution-workspaces/workspace-123")).toBe(true);
    expect(extractCompanyPrefixFromPath("/execution-workspaces/workspace-123")).toBeNull();
    expect(applyCompanyPrefix("/execution-workspaces/workspace-123", "PAP")).toBe(
      "/PAP/execution-workspaces/workspace-123",
    );
  });

  it("normalizes prefixed execution workspace paths back to company-relative paths", () => {
    expect(toCompanyRelativePath("/PAP/execution-workspaces/workspace-123")).toBe(
      "/execution-workspaces/workspace-123",
    );
  });

  it("treats newer board roots as non-company first segments", () => {
    expect(extractCompanyPrefixFromPath("/channels")).toBeNull();
    expect(extractCompanyPrefixFromPath("/notification-rules")).toBeNull();
    expect(extractCompanyPrefixFromPath("/tests/ux/runs")).toBeNull();
    expect(extractCompanyPrefixFromPath("/plugins/some-plugin")).toBeNull();
    expect(extractCompanyPrefixFromPath("/settings/anything")).toBeNull();
    expect(applyCompanyPrefix("/channels", "PAP")).toBe("/PAP/channels");
  });
});
