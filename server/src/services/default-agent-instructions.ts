import fs from "node:fs/promises";

const DEFAULT_AGENT_BUNDLE_FILES = {
  default: ["AGENTS.md", "OPTIMIZATIONS.md", "TOKEN_ECONOMICS.md", "KERNEL_FRAMEWORK.md"],
  ceo: ["AGENTS.md", "OPTIMIZATIONS.md", "TOKEN_ECONOMICS.md", "KERNEL_FRAMEWORK.md", "HEARTBEAT.md", "SOUL.md", "TOOLS.md"],
} as const;

type DefaultAgentBundleRole = keyof typeof DEFAULT_AGENT_BUNDLE_FILES;

function resolveDefaultAgentBundleUrl(role: DefaultAgentBundleRole, fileName: string) {
  return new URL(`../onboarding-assets/${role}/${fileName}`, import.meta.url);
}

export async function loadDefaultAgentInstructionsBundle(role: DefaultAgentBundleRole, agentName?: string): Promise<Record<string, string>> {
  const fileNames = DEFAULT_AGENT_BUNDLE_FILES[role];
  const entries = await Promise.all(
    fileNames.map(async (fileName) => {
      let content = await fs.readFile(resolveDefaultAgentBundleUrl(role, fileName), "utf8");
      if (agentName) {
        content = content.replace(/\{\{AGENT_NAME\}\}/g, agentName);
      }
      return [fileName, content] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function resolveDefaultAgentInstructionsBundleRole(role: string): DefaultAgentBundleRole {
  return role === "ceo" ? "ceo" : "default";
}
