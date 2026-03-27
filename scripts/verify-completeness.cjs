const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  const res = await client.query("SELECT name, adapter_config->'instructions' as inst FROM agents WHERE name IN ('Sophia', 'Sterling', 'Ingénieur', 'CEO')");
  
  for (const row of res.rows) {
    console.log(`\n=========================================`);
    console.log(`AGENT: ${row.name}`);
    console.log(`=========================================`);
    for (const [file, content] of Object.entries(row.inst || {})) {
      console.log(`\n--- [${file}] ---`);
      console.log(content);
    }
  }
  
  await client.end();
}

main().catch(console.error);
