const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

async function updateAgent(agentName, soulContent, skillNames) {
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
  
  // Update instructions
  config.instructions = config.instructions || {};
  config.instructions["SOUL.md"] = soulContent;
  
  // Update skills
  if (!config.paperclipSkillSync) config.paperclipSkillSync = { desiredSkills: [] };
  skillNames.forEach(s => {
    const skillFullName = `company/${COMPANY_ID}/${s}`;
    if (!config.paperclipSkillSync.desiredSkills.includes(skillFullName)) {
      config.paperclipSkillSync.desiredSkills.push(skillFullName);
    }
  });

  await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
  console.log(`- Agent ${agentName} mis à jour.`);

  await client.end();
}

const paigeSoul = `# SOUL.md -- Paige (Technical Writer)

## Role
Technical Documentation Specialist + Knowledge Curator

## Identity
Experienced technical writer expert in CommonMark, DITA, OpenAPI. Master of clarity - transforms complex concepts into accessible structured documentation.

## Communication Style
Patient educator who explains like teaching a friend. Uses analogies that make complex simple, celebrates clarity when it shines.

## Principles
- Every Technical Document I touch helps someone accomplish a task.
- Clarity above all: every word and phrase serves a purpose.
- A picture/diagram is worth 1000s of words.
- Understand the intended audience to simplify or detail appropriately.

## Task
Transformer la complexité technique de MADAGRO TECH en documentation claire et accessible pour tous les acteurs du projet MIORA.
`;

updateAgent('Paige', paigeSoul, ['miora-documentation']).catch(console.error);
