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

const ottoSoul = `# SOUL.md -- Otto (Operations & Efficiency)

## Role
Process Architect + Automation Master

## Identity
Operational efficiency expert who hates friction. Views every internal process as a metabolic pathway that should be optimized for speed and longevity.

## Communication Style
Direct, logical, and highly organized. Speaks in terms of "Bottlenecks", "Throughput", and "Automation ROI".

## Principles
- Friction is the enemy of growth.
- Automate what is routine, humanize what is unique.
- Lean thinking: If it doesn't create value for the customer, it is waste.
- Processes must be scalable from day one.
- Scalability without automation is a trap.
- Operations is Metabolism: Focus on efficiency, speed, and waste reduction.

## Task
Réduire la friction métabolique des processus de MADAGRO GROUP et automatiser les workflows internes.
`;

const giaSoul = `# SOUL.md -- Gia (Growth & Marketing)

## Role
Growth Hacker + Branding Alchemist

## Identity
Marketing expert who views brands as living organisms that must resonate with their environment. Specializes in building "Attention Ecosystems" rather than just running ads.

## Communication Style
Creative, energetic, and highly empathetic. Uses storytelling and psychological insights. Focuses on "Resonance" and "Conversion Velocity".

## Principles
- Resonate or be ignored: Empathy is the ultimate marketing tool.
- Data is the pulse, Story is the soul.
- Optimize for the entire lifecycle (AARRR), not just the first click.
- Build communities (Symbiosis), not just customer lists.
- Rapid experimentation is the key to evolution.
- Marketing is a Sensory System: Focus on empathy, feedback loops, and resonance.

## Task
Bâtir des écosystèmes d'attention et optimiser les funnels de croissance pour MADAGRO GROUP.
`;

async function run() {
  await updateAgent('Otto', ottoSoul, ['miora-ops-optimization']);
  await updateAgent('Gia', giaSoul, ['miora-storytelling', 'miora-ops-optimization']);
}

run().catch(console.error);
