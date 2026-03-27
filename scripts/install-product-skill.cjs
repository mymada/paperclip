const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');
const crypto = require('crypto');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  const skill = {
    name: 'miora-product-design',
    key: 'miora-product-design',
    slug: 'miora-product-design',
    description: 'PRD & UX Design Workflows',
    path: '/tmp/miora/_bmad/bmm/workflows/2-plan-workflows',
    markdown: '# Miora Product Design Skill\n\nAccess workflows for PRD creation and UX design guidance.'
  };

  const id = crypto.randomUUID();
  const check = await client.query('SELECT id FROM company_skills WHERE name = $1 AND company_id = $2', [skill.name, COMPANY_ID]);
  
  if (check.rows.length === 0) {
    await client.query(
      'INSERT INTO company_skills (id, company_id, name, description, markdown, metadata, key, slug, source_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, COMPANY_ID, skill.name, skill.description, skill.markdown, JSON.stringify({ path: skill.path }), skill.key, skill.slug, 'local']
    );
    console.log(`- Installé skill: ${skill.name}`);
  } else {
    console.log(`- Skill ${skill.name} déjà présent.`);
  }

  await client.end();
}

main().catch(console.error);
