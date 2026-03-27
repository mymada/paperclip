const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  const res = await client.query("SELECT name, adapter_config->'instructions' as inst FROM agents WHERE company_id = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a' LIMIT 5");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
