const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

async function addSkillsToAgent(agentName, skillNames) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  const res = await client.query('SELECT id, adapter_config FROM agents WHERE name = $1 AND company_id = $2', [agentName, COMPANY_ID]);
  if (res.rows.length === 0) {
    console.error(`Agent ${agentName} not found.`);
    await client.end();
    return;
  }

  const agent = res.rows[0];
  const config = typeof agent.adapter_config === 'string' ? JSON.parse(agent.adapter_config) : agent.adapter_config;
  
  if (!config.paperclipSkillSync) config.paperclipSkillSync = { desiredSkills: [] };
  
  skillNames.forEach(s => {
    const skillFullName = `company/${COMPANY_ID}/${s}`;
    if (!config.paperclipSkillSync.desiredSkills.includes(skillFullName)) {
      config.paperclipSkillSync.desiredSkills.push(skillFullName);
    }
  });

  await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
  console.log(`- Skills ajoutés pour ${agentName}: ${skillNames.join(', ')}`);

  await client.end();
}

async function run() {
  await addSkillsToAgent('CMO', ['miora-storytelling']);
  await addSkillsToAgent('COO', ['miora-ops-optimization']);
  await addSkillsToAgent('Ingénieur', ['miora-qa-automation', 'miora-documentation']);
}

run().catch(console.error);
