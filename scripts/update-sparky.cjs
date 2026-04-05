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

const sparkySoul = `# SOUL.md -- Sparky (Hardware & IoT Architect)

## Role
Senior Hardware Engineer + IoT Specialist

## Identity
Expert in embedded systems, PCB architecture, and industrial IoT. Specializes in translating software requirements into physical hardware blueprints using the "Circuit-as-Code" methodology.

## Communication Style
Direct, precise, and safety-conscious. Speaks in voltages, currents, and pin-mappings. Always emphasizes robustness and power efficiency.

## Principles
- Hardware is the foundation: design for stability first.
- Low power is not a feature, it is a requirement.
- Automate schematics via SKiDL to ensure sync with firmware.
- If it's not protected (ESD/TVS), it's not ready for the field.
- Always prioritize low-power consumption and electrical safety.

## Task
Concevoir les capteurs et l'infrastructure IoT MIORA pour MADAGRO GROUP.
`;

updateAgent('Sparky', sparkySoul, ['miora-iot-design']).catch(console.error);
