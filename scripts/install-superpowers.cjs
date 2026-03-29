const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';
const SUPERPOWERS_PATH = '/root/paperclip/skills/superpowers/skills';

async function installSuperpowers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  try {
    await client.connect();
    console.log('Connecté à la base de données.');

    const directories = fs.readdirSync(SUPERPOWERS_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dir of directories) {
      const skillPath = path.join(SUPERPOWERS_PATH, dir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf8');
      
      const nameMatch = content.match(/name:\s*(.+)/);
      const descMatch = content.match(/description:\s*(.+)/);
      
      const name = nameMatch ? nameMatch[1].trim() : dir;
      const description = descMatch ? descMatch[1].trim() : `Superpowers skill: ${dir}`;
      const slug = `superpowers-${dir}`;
      const key = slug;

      const check = await client.query('SELECT id FROM company_skills WHERE slug = $1 AND company_id = $2', [slug, COMPANY_ID]);
      
      if (check.rows.length === 0) {
        const id = crypto.randomUUID();
        await client.query(
          'INSERT INTO company_skills (id, company_id, name, description, markdown, metadata, key, slug, source_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [id, COMPANY_ID, name, description, content, JSON.stringify({ path: skillPath, origin: 'superpowers' }), key, slug, 'local']
        );
        console.log(`- Installé superpower: ${name} (${slug})`);
      } else {
        await client.query(
          'UPDATE company_skills SET name = $1, description = $2, markdown = $3, metadata = $4 WHERE slug = $5 AND company_id = $6',
          [name, description, content, JSON.stringify({ path: skillPath, origin: 'superpowers' }), slug, COMPANY_ID]
        );
        console.log(`- Mis à jour superpower: ${name} (${slug})`);
      }
    }

    console.log('Installation des superpowers terminée avec succès.');
  } catch (err) {
    console.error('Erreur lors de l\'installation:', err);
  } finally {
    await client.end();
  }
}

installSuperpowers();
