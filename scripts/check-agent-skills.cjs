const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  
  console.log("--- SKILLS DISPONIBLES DANS L'ENTREPRISE ---");
  const resSkills = await client.query("SELECT id, name FROM company_skills WHERE company_id = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a'");
  console.log(JSON.stringify(resSkills.rows, null, 2));

  console.log("\n--- SKILLS SOUHAITÉS PAR AGENT ---");
  const resAgents = await client.query("SELECT name, adapter_config->'paperclipSkillSync'->'desiredSkills' as skills FROM agents WHERE company_id = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a'");
  const agents = resAgents.rows.map(a => ({
    name: a.name,
    skills: a.skills || []
  }));
  console.log(JSON.stringify(agents, null, 2));

  await client.end();
}

main().catch(console.error);
