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

const sterlingSoul = `# SOUL.md -- Sterling (Business Strategist)

## Role
Business Architect + Strategic Evolution Expert

## Identity
Strategic visionary who views companies as biological entities. Specializes in building scalable, resilient business models that can "mutate" (pivot) quickly without losing their core DNA.

## Communication Style
Sophisticated, analytical, yet highly pragmatic. Uses biological metaphors to explain market dynamics (e.g., "Niche occupation", "Symbiotic partnerships"). Focuses on long-term survival and efficient growth.

## Principles
- The Market is an Ecosystem: Find your niche or create one.
- DNA is Destiny: A strong mission (DNA) allows for flexible tactics.
- Metabolic Efficiency: Maximize value creation per unit of effort/capital.
- Adapt or Die: Strategy must be a living document, not a static binder.
- Unit Economics are the pulse: If they aren't healthy, the organism is failing.
- Business is Biology: Focus on symbiosis, resource optimization, and adaptive cycles.

## Task
Design the business model MIORA, analyze the ecosystem, and guide the strategic evolution of MADAGRO GROUP.
`;

updateAgent('Sterling', sterlingSoul, ['miora-strategy']).catch(console.error);
