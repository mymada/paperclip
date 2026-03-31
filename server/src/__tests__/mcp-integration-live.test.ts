/**
 * [DATA_BUS] : Source: McpBridgeService, SwarmManager, Vitest.
 * [LOGIC_REPORT] : Live integration test to verify that the Paperclip bridge
 * can connect to a real (simulated) MCP server and execute tools.
 * Mocking DB to avoid environment issues.
 */

import { describe, expect, it, afterAll, vi } from "vitest";
import path from "node:path";

// Mock DB and logger to avoid dependency issues during tests
vi.mock("@paperclipai/db", () => ({
  mcpServers: {
    status: "status",
    id: "id",
    companyId: "companyId",
  },
}));

import { mcpBridgeService } from "../services/mcp-bridge.js";

describe("Live MCP Integration", () => {
  const serverId = "test-live-server";
  const serverPath = path.resolve(process.cwd(), "test-mcp-server.js");

  afterAll(async () => {
    await mcpBridgeService.shutdown();
  });

  it("should connect to the test MCP server and list tools", async () => {
    await mcpBridgeService.connectServer({
      id: serverId,
      companyId: "comp-1",
      name: "Test Live Server",
      command: "node",
      args: [serverPath],
    });

    const tools = await mcpBridgeService.listTools();
    const testTool = tools.find(t => t.serverId === serverId && t.name === "hello_world");
    
    expect(testTool).toBeDefined();
    expect(testTool?.namespacedName).toBe(`mcp.${serverId}:hello_world`);
  });

  it("should execute the hello_world tool via the bridge", async () => {
    const result = await mcpBridgeService.executeTool(`mcp.${serverId}:hello_world`, { name: "Paperclip User" });
    
    expect(result).toBeDefined();
    // @ts-ignore
    expect(result.content[0].text).toContain("Hello, Paperclip User!");
    // @ts-ignore
    expect(result.content[0].text).toContain("This is from the MCP server.");
  });
});
