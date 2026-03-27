import postgres from "postgres";

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  const issues = await sql`SELECT * FROM issues WHERE description LIKE '%agent-1%' OR title LIKE '%agent-1%' OR assignee_agent_id = 'agent-1'`;
  console.log(JSON.stringify(issues, null, 2));
  await sql.end();
}

main().catch(console.error);
