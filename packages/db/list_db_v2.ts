import postgres from "postgres";

async function main() {
  const sql = postgres({
    host: "localhost",
    port: 54329,
    user: "paperclip",
    database: "paperclip",
    pass: "paperclip",
    onnotice: () => {},
  });

  const companies = await sql`SELECT * FROM companies`;
  console.log("Companies:", JSON.stringify(companies, null, 2));

  const agents = await sql`SELECT * FROM agents`;
  console.log("Agents:", JSON.stringify(agents, null, 2));

  const issues = await sql`SELECT * FROM issues`;
  console.log("Issues:", JSON.stringify(issues, null, 2));

  await sql.end();
}

main().catch(console.error);
