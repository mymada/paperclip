import { db, agents } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";

async function main() {
  const allAgents = await db.select().from(agents).where(eq(agents.adapterType, "gemini_local"));
  console.log(`Found ${allAgents.length} Gemini agents.`);
  for (const agent of allAgents) {
    const config = agent.adapterConfig as any;
    console.log(`Agent ${agent.id} (${agent.name}): sandbox = ${config?.sandbox}`);
  }
  process.exit(0);
}

main().catch(console.error);
