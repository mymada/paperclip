---
name: paperclip-create-plugin
description: >
  Create new Paperclip plugins with the current SDK v1 and native design standards.
  Use when scaffolding a plugin package, adding a new example plugin, or updating
  plugin authoring docs. Covers SDK v1 (definePlugin), Tailwind CSS styling,
  and Bootstrap Agents.
---

# Create a Paperclip Plugin

Use this skill when the task is to create, scaffold, or document a Paperclip plugin.

## 1. Ground rules

1.  **SDK v1 Compliance**: Always use `definePlugin` and `runWorker` from `@paperclipai/plugin-sdk`. Use `PaperclipPluginManifestV1` for the manifest.
2.  **Tailwind CSS**: Use standard Tailwind CSS classes for all UI components. Adhere to the host theme by using tokens like `bg-card`, `text-muted-foreground`, `border-border`, and `bg-primary`.
3.  **Bootstrap Agents**: When a plugin provides tools, always include `bootstrapAgents` in the manifest to provide pre-configured expert agents that know how to use those tools.
4.  **Trusted Code**: Plugin workers and UI are trusted code. UI is same-origin with the host and has access to `usePluginData` and `usePluginAction` hooks.
5.  **Capability-Gated**: Declare only the necessary `capabilities` in the manifest. Workers cannot access APIs they haven't declared.

Read these first when needed:
- `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`
- `packages/plugins/sdk/README.md`

## 2. Preferred workflow

Use the scaffold package instead of hand-writing the boilerplate:

```bash
pnpm --filter @paperclipai/create-paperclip-plugin build
node packages/plugins/create-paperclip-plugin/dist/index.js <npm-package-name> --output <target-dir>
```

Recommended target inside this repo:
- `packages/plugins/examples/` for example plugins
- `packages/plugins/<name>/` for integrated packages

## 3. Code Blueprints

### `manifest.ts`
```typescript
import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "my-plugin",
  apiVersion: 1,
  version: "1.0.0",
  displayName: "My Plugin",
  description: "Connects Paperclip to external services.",
  capabilities: ["http.outbound", "agent.tools.register", "ui.page.register"],
  instanceConfigSchema: {
    type: "object",
    required: ["apiUrl"],
    properties: {
      apiUrl: { type: "string", title: "API URL" },
      apiKey: { type: "string", title: "API Key", description: "Prefer secret reference: ${secret:my-key}" },
    },
  },
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  tools: [
    {
      name: "my_tool",
      displayName: "My Tool",
      description: "Performs a specific action via the external API.",
      parametersSchema: {
        type: "object",
        required: ["query"],
        properties: { query: { type: "string" } },
      },
    },
  ],
  bootstrapAgents: [
    {
      slug: "expert-agent",
      name: "Expert Agent",
      role: "agent",
      instructions: "# Expert Agent\n\nYou use the my_tool to...",
      skills: ["my-plugin"],
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: "main-page",
        displayName: "Plugin Dashboard",
        exportName: "PluginPage",
        routePath: "/my-plugin",
      },
    ],
  },
};

export default manifest;
```

### `worker.ts`
```typescript
import { definePlugin, runWorker, type PluginContext } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info("Plugin starting up");

    ctx.tools.register("my_tool", async (params) => {
      const { query } = params as { query: string };
      // Implement logic using ctx.http, ctx.secrets, etc.
      return { content: `Result for ${query}` };
    });
  },

  async onHealth() {
    return { status: "ok", message: "Service reachable" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

### `ui/index.tsx`
```tsx
import { usePluginData, type PluginPageProps } from "@paperclipai/plugin-sdk/ui";

export function PluginPage({ context }: PluginPageProps) {
  const { data, loading, error } = usePluginData("my-data-key", { id: context.companyId });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Plugin Dashboard</h1>
      </div>

      {loading && <div className="text-muted-foreground animate-pulse">Loading...</div>}
      {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">{error.message}</div>}
      
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-card border rounded-xl shadow-sm">
            <h2 className="text-sm font-semibold mb-2">Summary</h2>
            <p className="text-2xl font-bold">42</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 4. Verification

Always run:
```bash
pnpm --filter <plugin-package> build
pnpm --filter <plugin-package> typecheck
```

Checklist:
- [ ] Uses `definePlugin` and `runWorker` (SDK v1).
- [ ] UI uses Tailwind CSS and follows host theme colors.
- [ ] `bootstrapAgents` are provided if the plugin registers tools.
- [ ] All required capabilities are declared in `manifest.ts`.

## 5. Documentation Expectations

- Distinguish current implementation from future spec ideas.
- Document all tool parameters and return values clearly.
- Prefer npm-package deployment guidance over repo-local workflows for production.
