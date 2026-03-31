/**
 * [DATA_BUS] : Source: McpBridgeService, Vitest, MCP SDK.
 * [LOGIC_REPORT] : Tests the McpBridgeService using mocks for the MCP SDK to verify
 * tool listing and execution routing.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: "test-tool", description: "A test tool", inputSchema: { type: "object" } }
        ]
      }),
      callTool: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "success" }] }),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
  return {
    StdioClientTransport: vi.fn().mockImplementation(() => ({})),
  };
});

// Import service after mocks
import { mcpBridgeService } from "../services/mcp-bridge.js";

describe("McpBridgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should connect to a server and list tools", async () => {
    await mcpBridgeService.connectServer({
      id: "test-server",
      name: "Test Server",
      command: "node",
      args: ["test.js"],
    });

    const tools = await mcpBridgeService.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].namespacedName).toBe("mcp.test-server:test-tool");
    expect(tools[0].serverId).toBe("test-server");
  });

  it("should execute a namespaced tool", async () => {
    // Ensure connected
    await mcpBridgeService.connectServer({
      id: "test-server",
      name: "Test Server",
      command: "node",
    });

    const result = await mcpBridgeService.executeTool("mcp.test-server:test-tool", { arg1: "val" });
    expect(result).toBeDefined();
    // @ts-ignore
    expect(result.content[0].text).toBe("success");
  });

  it("should throw error for invalid namespaced names", async () => {
    await expect(mcpBridgeService.executeTool("invalid-name", {})).rejects.toThrow("Invalid MCP tool name");
    await expect(mcpBridgeService.executeTool("mcp.missing-server:tool", {})).rejects.toThrow("not found");
  });
});
