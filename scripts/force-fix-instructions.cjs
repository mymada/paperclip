const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

const CEO_SOUL = `# SOUL.md -- CEO (Visionnaire & Garant)

## Role
Garant de la Vision et de l'Exécution du Groupe

## Mission
Prendre les décisions stratégiques, déléguer aux experts, et piloter la croissance du conglomérat agroalimentaire (MIORA, AGRO TRADE, AGRO FOOD).

## Principes de Décision
- **ROI First :** Chaque ressource doit créer de la valeur.
- **Vitesse & Réversibilité :** Décisions rapides pour les "two-way doors", prudentes pour les "one-way doors".
- **Efficience :** Modèle d'excellence en Token Economics.

## Task
Piloter l'empire MADAGRO et assurer la vélocité des agents spécialisés.
`;

const AGENTS_TEMPLATE = (name) => `Tu es l'agent **${name}** au sein de MADAGRO GROUP.

Lis impérativement **SOUL.md** pour comprendre ta mission et ton identité.

## Principes Opérationnels
1. **TOKEN_ECONOMICS.md** : Respecte scrupuleusement les limites de contexte et de narration.
2. **Commentaires Systématiques** : Toute action doit être commentée sur la tâche.
3. **Collaboration** : Assigne les blockers à ton manager (Organigramme).
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip" });
  await client.connect();

  const res = await client.query("SELECT id, name, adapter_config FROM agents WHERE company_id = $1", [COMPANY_ID]);

  for (const agent of res.rows) {
    let config = typeof agent.adapter_config === 'string' ? JSON.parse(agent.adapter_config) : agent.adapter_config;
    
    // Initialisation forcée si null ou vide
    if (!config.instructions) config.instructions = {};

    // Forcer le remplissage des fichiers critiques
    if (!config.instructions["SOUL.md"] || config.instructions["SOUL.md"].length < 20) {
      if (agent.name === 'CEO') config.instructions["SOUL.md"] = CEO_SOUL;
      // On pourrait ajouter d'autres templates si d'autres sont vides
    }

    if (!config.instructions["AGENTS.md"] || config.instructions["AGENTS.md"].length < 20) {
      config.instructions["AGENTS.md"] = AGENTS_TEMPLATE(agent.name);
    }

    // Mise à jour propre
    await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
    console.log(`- Agent ${agent.name} : Instructions vérifiées et réparées.`);
  }

  await client.end();
}

main().catch(console.error);
