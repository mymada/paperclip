/**
 * [DATA_BUS] : Source: Claude Code MCP patterns, Paperclip DB.
 * [LOGIC_REPORT] : Implements a persistent MCP Bridge to allow any agent 
 * to access external tools via the Model Context Protocol, with DB persistence.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { mcpServers } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  id: string;
  companyId: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpToolDescriptor {
  name: string;
  namespacedName: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  serverId: string;
}

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

class McpBridgeServiceImpl {
  private clients: Map<string, Client> = new Map();
  private serverConfigs: Map<string, McpServerConfig> = new Map();
  private db: Db | null = null;

  /**
   * Initialize and connect to all active MCP servers from the database.
   */
  async initialize(db: Db): Promise<void> {
    this.db = db;
    logger.info("[mcp-bridge] Initializing MCP bridge from database...");
    
    const activeServers = await db.select().from(mcpServers).where(eq(mcpServers.status, "active"));
    
    for (const server of activeServers) {
      try {
        await this.connectServer({
          id: server.id,
          companyId: server.companyId,
          name: server.name,
          command: server.command,
          args: server.args,
          env: server.env,
        });
      } catch (error) {
        logger.error({ err: error }, `[mcp-bridge] Initial connection to MCP server "${server.id}" failed`);
      }
    }
    
    logger.info(`[mcp-bridge] Initialized with ${this.clients.size} active MCP servers.`);
  }

  /**
   * Register and connect to an MCP server.
   * [SOURCE: KERNEL Couche D - RELAY_PROTOCOL]
   */
  async connectServer(config: McpServerConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      return;
    }

    logger.info(`[mcp-bridge] Connecting to MCP server "${config.name}" (${config.id})`);

    const mergedEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) mergedEnv[k] = v;
    }
    for (const [k, v] of Object.entries(config.env ?? {})) {
      mergedEnv[k] = v;
    }
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: mergedEnv,
    });

    const client = new Client(
      { name: "paperclip-host", version: "0.1.0" },
      { capabilities: {} }
    );

    try {
      await client.connect(transport);
      this.clients.set(config.id, client);
      this.serverConfigs.set(config.id, config);
      logger.info(`[mcp-bridge] Connected to MCP server "${config.id}"`);
    } catch (error) {
      logger.error({ err: error }, `[mcp-bridge] Failed to connect to MCP server "${config.id}"`);
      throw error;
    }
  }

  /**
   * List all tools from all connected MCP servers.
   */
  async listTools(): Promise<McpToolDescriptor[]> {
    const allTools: McpToolDescriptor[] = [];

    for (const [serverId, client] of this.clients.entries()) {
      try {
        const response = await client.listTools();
        const tools = response.tools.map((tool) => ({
          name: tool.name,
          namespacedName: `mcp.${serverId}:${tool.name}`,
          description: tool.description ?? "",
          parametersSchema: (tool.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
          serverId,
        }));
        allTools.push(...tools);
      } catch (error) {
        logger.warn({ err: error }, `[mcp-bridge] Failed to list tools for MCP server "${serverId}"`);
      }
    }

    return allTools;
  }

  /**
   * Execute an MCP tool.
   * Namespaced name format: "mcp.<serverId>:<toolName>"
   */
  async executeTool(namespacedName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!namespacedName.startsWith("mcp.")) {
      throw new Error(`Invalid MCP tool name: ${namespacedName}`);
    }

    const parts = namespacedName.slice(4).split(":");
    if (parts.length !== 2) {
      throw new Error(`Malformed MCP tool name: ${namespacedName}. Expected mcp.<serverId>:<toolName>`);
    }

    const [serverId, toolName] = parts;
    const client = this.clients.get(serverId);

    if (!client) {
      throw new Error(`MCP server "${serverId}" not found or not connected.`);
    }

    logger.debug(`[mcp-bridge] Executing MCP tool "${toolName}" on server "${serverId}"`);

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (error) {
      logger.error({ err: error }, `[mcp-bridge] Error executing MCP tool "${namespacedName}"`);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    for (const [id, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (error) {
        logger.warn({ err: error }, `[mcp-bridge] Error closing MCP client "${id}"`);
      }
    }
    this.clients.clear();
  }
}

export const mcpBridgeService = new McpBridgeServiceImpl();
