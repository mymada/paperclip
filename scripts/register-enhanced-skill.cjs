const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMPANY_ID = '86d329a2-664b-414d-b37e-e659241e5e94';
const SKILL_NAME = 'paperclip-create-plugin';
const SKILL_MD_PATH = path.join(__dirname, '../skills/paperclip-create-plugin/SKILL.md');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  const markdown = fs.readFileSync(SKILL_MD_PATH, 'utf8');
  const description = "Create new Paperclip plugins with SDK v1, Tailwind, and Bootstrap Agents.";

  const check = await client.query('SELECT id FROM company_skills WHERE name = $1 AND company_id = $2', [SKILL_NAME, COMPANY_ID]);

  if (check.rows.length === 0) {
    const id = crypto.randomUUID();
    await client.query(
      'INSERT INTO company_skills (id, company_id, name, description, markdown, key, slug, source_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, COMPANY_ID, SKILL_NAME, description, markdown, SKILL_NAME, SKILL_NAME, 'local']
    );
    console.log(`- Installed enhanced skill: ${SKILL_NAME}`);
  } else {
    await client.query(
      'UPDATE company_skills SET description = $1, markdown = $2, updated_at = NOW() WHERE name = $3 AND company_id = $4',
      [description, markdown, SKILL_NAME, COMPANY_ID]
    );
    console.log(`- Updated enhanced skill: ${SKILL_NAME}`);
  }

  await client.end();
}

main().catch(console.error);
