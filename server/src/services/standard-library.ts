import type { PaperclipPluginManifestV1 } from "@paperclipai/shared";

export interface StandardLibraryPlugin {
  id: string;
  manifest: PaperclipPluginManifestV1;
}

export const STANDARD_LIBRARY_PLUGINS: StandardLibraryPlugin[] = [
  {
    id: "paperclip.scraper",
    manifest: {
      id: "paperclip.scraper",
      apiVersion: 1,
      version: "1.0.0",
      displayName: "Official Scraper",
      description: "Deterministic high-speed web scraper (Rust-based).",
      author: "Paperclip Core Team",
      categories: ["automation"],
      capabilities: ["agent.tools.register"],
      dockerImage: "registry.paperclip.ai/scraper:latest",
      entrypoints: {
        worker: "main"
      },
      tools: [
        {
          name: "scrape_url",
          displayName: "Scrape URL",
          description: "Scrape content from a URL efficiently.",
          parametersSchema: {
            type: "object",
            properties: {
              url: { type: "string", format: "uri" }
            },
            required: ["url"]
          }
        }
      ]
    }
  },
  {
    id: "paperclip.linter",
    manifest: {
      id: "paperclip.linter",
      apiVersion: 1,
      version: "1.0.0",
      displayName: "Official Linter",
      description: "Fast multi-language linter (Go-based).",
      author: "Paperclip Core Team",
      categories: ["automation"],
      capabilities: ["agent.tools.register"],
      dockerImage: "registry.paperclip.ai/linter:latest",
      entrypoints: {
        worker: "main"
      },
      tools: [
        {
          name: "lint_files",
          displayName: "Lint Files",
          description: "Lint files in the workspace.",
          parametersSchema: {
            type: "object",
            properties: {
              paths: { type: "array", items: { type: "string" } }
            },
            required: ["paths"]
          }
        }
      ]
    }
  },
  {
    id: "paperclip.swarm",
    manifest: {
      id: "paperclip.swarm",
      apiVersion: 1,
      version: "1.0.0",
      displayName: "Swarm Manager",
      description: "Spawn isolated worker agents in Git worktrees.",
      author: "Paperclip Core Team",
      categories: ["automation"],
      capabilities: ["agent.tools.register"],
      entrypoints: {
        worker: "internal"
      },
      tools: [
        {
          name: "spawn_worker",
          displayName: "Spawn Worker",
          description: "Spawn a new worker agent in an isolated Git worktree to perform a sub-task.",
          parametersSchema: {
            type: "object",
            properties: {
              role: { type: "string", description: "The role of the worker (e.g. 'tester', 'debugger')" },
              objective: { type: "string", description: "The specific task for the worker" }
            },
            required: ["role", "objective"]
          }
        }
      ]
    }
  }
];

