# PRD: Paperclip Evolution via Claude Code Inspiration

## 1. Executive Summary
This document outlines technical improvements for the Paperclip project, drawing inspiration from the orchestration patterns and CLI optimizations found in the Claude Code repository. The goal is to move Paperclip from a static agent hierarchy to a dynamic, swarm-capable autonomous platform.

---

## 2. Proposal 1: Paperclip Swarm (Dynamic Agent Spawning)

### Context
Paperclip currently relies on a database-backed organizational chart. Adding new agents requires manual configuration or specific "hire" workflows that are relatively slow and persistent.

### Task
Implement a `Coordinator Mode` where a lead agent can dynamically spawn "Workers" for specific sub-tasks.

### Requirements
- **Dynamic Spawning:** A new `AgentTool` (inspired by Claude Code's `AgentTool.tsx`) that allows an agent to request a "Worker" with a specific role and limited toolset.
- **Transient Lifecycle:** Workers should exist for the duration of a task and their history should be optionally rolled up into the parent's context.
- **Isolation:** Each worker should have its own workspace or sub-directory to prevent file collisions.

### Technical Implementation (Inspiration: `src/tools/AgentTool/runAgent.ts`)
- Use a `subagentContext` that inherits parent secrets but uses a restricted tool definition.
- Implement `forkSubagent` logic to manage child processes for the `claude` CLI.

---

## 3. Proposal 2: Native Model Context Protocol (MCP) Bridge

### Context
Paperclip currently uses custom adapters/plugins for external tools. Claude Code heavily leverages MCP, allowing it to interface with a vast ecosystem of third-party tools (Google Search, Slack, SQL, etc.) natively.

### Task
Integrate a native MCP client into the Paperclip server.

### Requirements
- **MCP Registry:** Allow users to register MCP server URLs/commands at the Company or Project level.
- **Dynamic Tool Loading:** Agents should automatically discover and use tools provided by connected MCP servers.
- **Compatibility:** Support both `stdio` and `sse` (Server-Sent Events) MCP transports.

### Technical Implementation (Inspiration: `src/services/mcp/`)
- Port or wrap the `@modelcontextprotocol/sdk` to allow Paperclip agents to call MCP tools.
- Map Paperclip's `Tool` interface to MCP's `CallToolRequest`.

---

## 4. Proposal 3: Live Status Tasks & Lifecycle Hooks

### Context
Paperclip's task (Issue) management is similar to traditional ticket systems (Backlog -> Todo -> Done). It lacks the "active" feel of a running CLI agent.

### Task
Enhance the `issues` service with real-time feedback and execution hooks.

### Requirements
- **Active State:** Add an `activeForm` (e.g., "Analyzing codebase...") to the task schema.
- **Lifecycle Hooks:** Implement `preTaskCreated`, `onTaskStarted`, and `onTaskFinished` hooks (inspired by Claude Code's `utils/hooks.ts`).
- **Real-time UI:** The Paperclip dashboard should show the "activeForm" with a spinner while an agent is working on a specific task.

### Technical Implementation (Inspiration: `src/tools/TaskCreateTool/TaskCreateTool.ts`)
- Update `issues` table in DB to include `active_form` and `current_operation`.
- Emit Live Events (WebSockets) whenever an agent updates its active form.

---

## 5. Proposal 4: Claude-CLI Optimization (The "Tengu" Pattern)

### Context
Paperclip's `claude-local` adapter wraps the `claude` CLI but doesn't fully exploit its internal prompt caching and structured output capabilities.

### Task
Optimize the interaction between Paperclip and the `claude` binary.

### Requirements
- **Prompt Caching Alignment:** Structure system prompts and context to maximize Anthropic's prompt caching.
- **Structured IO:** Use the `--json` or structured output modes of `claude` (if available) to avoid fragile regex parsing of stdout.
- **Context Pruning:** Implement a "sliding window" or "summarization" context manager to prevent hitting token limits on long-running autonomous sessions.

### Technical Implementation (Inspiration: `src/cli/structuredIO.ts` and `src/utils/fileStateCache.ts`)
- Refactor `paperclip/packages/adapters/claude-local/src/server/execute.ts` to use structured data for tool calls.
- Implement a "File State Cache" to only send changed files to the `claude` CLI in subsequent heartbeats.

---

## 6. Conclusion & Roadmap
1. **Phase 1 (Native MCP):** Unlock massive tool ecosystem.
2. **Phase 2 (Swarm/Coordinator):** Enable parallel sub-tasking.
3. **Phase 3 (Live UI):** Improve human-in-the-loop monitoring.
4. **Phase 4 (Deep Optimization):** Reduce latency and cost for `claude-local` runs.
