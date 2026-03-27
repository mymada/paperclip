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

  const logs = await sql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20`;
  console.log("Activity Logs:", JSON.stringify(logs, null, 2));

  await sql.end();
}

main().catch(console.error);
