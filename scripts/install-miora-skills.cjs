const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');
const crypto = require('crypto');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

const mioraSkills = [
  { name: 'miora-strategy', description: 'Business Model Evolution & Ecosystem Mapping', path: '/tmp/miora/_bmad/bmm/workflows/0-business-core/business-model-evolution' },
  { name: 'miora-storytelling', description: 'Narrative Strategy & Story Crafting', path: '/tmp/miora/_bmad/cis/workflows/storytelling' },
  { name: 'miora-iot-design', description: 'Hardware & IoT Architecture Design', path: '/tmp/miora/_bmad/bmm/workflows/3-solutioning/hardware-design' },
  { name: 'miora-product-design', description: 'PRD & UX Design Workflows', path: '/tmp/miora/_bmad/bmm/workflows/2-plan-workflows' },
  { name: 'miora-qa-automation', description: 'Automated E2E & API Testing', path: '/tmp/miora/_bmad/bmm/workflows/qa-generate-e2e-tests' },
  { name: 'miora-ops-optimization', description: 'Process Automation & Resource Metabolism', path: '/tmp/miora/_bmad/bmm/workflows/0-business-core/automation-optimization' }
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  console.log("1. Installation des skills Miora dans l'entreprise...");
  for (const skill of mioraSkills) {
    const id = crypto.randomUUID();
    // On vérifie si le skill existe déjà
    const check = await client.query('SELECT id FROM company_skills WHERE name = $1 AND company_id = $2', [skill.name, COMPANY_ID]);
    if (check.rows.length === 0) {
      await client.query(
        'INSERT INTO company_skills (id, company_id, name, description, config) VALUES ($1, $2, $3, $4, $5)',
        [id, COMPANY_ID, skill.name, skill.description, JSON.stringify({ path: skill.path })]
      );
      console.log(`- Installé : ${skill.name}`);
    } else {
      console.log(`- Déjà présent : ${skill.name}`);
    }
  }

  console.log("\n2. Attribution des skills aux agents...");
  
  const assignments = [
    { agent: 'Sterling', skills: ['miora-strategy'] },
    { agent: 'Sophia', skills: ['miora-storytelling'] },
    { agent: 'Sparky', skills: ['miora-iot-design'] },
    { agent: 'John', skills: ['miora-product-design'] },
    { agent: 'Sally', skills: ['miora-product-design'] },
    { agent: 'Quinn', skills: ['miora-qa-automation'] },
    { agent: 'Otto', skills: ['miora-ops-optimization'] },
    { agent: 'Gia', skills: ['miora-storytelling', 'miora-ops-optimization'] }
  ];

  for (const assign of assignments) {
    const res = await client.query('SELECT id, adapter_config FROM agents WHERE name = $1 AND company_id = $2', [assign.agent, COMPANY_ID]);
    if (res.rows.length > 0) {
      const agent = res.rows[0];
      const config = agent.adapter_config;
      if (!config.paperclipSkillSync) config.paperclipSkillSync = { desiredSkills: [] };
      
      assign.skills.forEach(s => {
        const skillFullName = `company/${COMPANY_ID}/${s}`;
        if (!config.paperclipSkillSync.desiredSkills.includes(skillFullName)) {
          config.paperclipSkillSync.desiredSkills.push(skillFullName);
        }
      });

      await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
      console.log(`- Skills mis à jour pour ${assign.agent}`);
    }
  }

  await client.end();
}

main().catch(console.error);
