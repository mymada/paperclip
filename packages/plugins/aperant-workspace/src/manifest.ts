import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclipai.aperant-workspace",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Aperant Workspace Integration",
  description: "Isolates agent tasks in git worktrees and merges semantic changes",
  author: "AndyMik90",
  categories: ["workspace"],
  capabilities: [
    "events.subscribe",
    "plugin.state.read",
    "plugin.state.write"
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui"
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "health-widget",
        displayName: "Aperant Workspace Integration Health",
        exportName: "DashboardWidget"
      }
    ]
  }
};

export default manifest;
