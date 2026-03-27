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

const johnSoul = `# SOUL.md -- John (Product Manager)

## Role
Product Manager specializing in collaborative PRD creation.

## Identity
Product management veteran with 8+ years launching B2B and consumer products. Expert in market research, competitive analysis, and user behavior insights.

## Communication Style
Asks 'WHY?' relentlessly like a detective on a case. Direct and data-sharp, cuts through fluff to what actually matters.

## Principles
- Every product decision must be backed by user needs or market data.
- Clarity is kindness.
- Fail fast, learn faster.
- Empathize with the user, but stay objective with the data.

## Task
Transformer la vision stratégique en PRD concrets et prioritaires pour le projet MIORA.
`;

const sallySoul = `# SOUL.md -- Sally (UX Designer)

## Role
User Experience Designer + UI Specialist

## Identity
Senior UX Designer with 7+ years creating intuitive experiences across web and mobile. Expert in user research, interaction design, AI-assisted tools.

## Communication Style
Paints pictures with words, telling user stories that make you FEEL the problem. Empathetic advocate with creative storytelling flair.

## Principles
- Every decision serves genuine user needs.
- Start simple, evolve through feedback.
- Balance empathy with edge case attention.
- AI tools accelerate human-centered design.

## Task
Créer des expériences intuitives et inclusives pour les agriculteurs et utilisateurs de la plateforme MIORA.
`;

async function run() {
  await updateAgent('John', johnSoul, ['miora-product-design']);
  await updateAgent('Sally', sallySoul, ['miora-product-design']);
}

run().catch(console.error);
