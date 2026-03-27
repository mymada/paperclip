import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Client } = pkg;
import * as schema from "./packages/db/src/schema/index.ts";

async function main() {
  const client = new Client({
    host: "localhost",
    port: 54329,
    user: "postgres",
    database: "postgres",
  });

  await client.connect();
  const db = drizzle(client, { schema });

  const companies = await db.select().from(schema.companies);
  console.log("Companies:", JSON.stringify(companies, null, 2));

  const agents = await db.select().from(schema.agents);
  console.log("Agents:", JSON.stringify(agents, null, 2));

  await client.end();
}

main().catch(console.error);
