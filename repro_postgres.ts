import { startEmbeddedPostgresTestDatabase } from "./packages/db/src/test-embedded-postgres.ts";

async function main() {
  try {
    console.log("Starting embedded postgres...");
    const db = await startEmbeddedPostgresTestDatabase("repro-test-");
    console.log("Success! Connection string:", db.connectionString);
    await db.cleanup();
    console.log("Cleaned up.");
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

main();
