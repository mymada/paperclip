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
  }
];

export function standardLibraryService() {
  return {
    list: () => STANDARD_LIBRARY_PLUGINS,
    get: (id: string) => STANDARD_LIBRARY_PLUGINS.find(p => p.id === id) ?? null,
  };
}
