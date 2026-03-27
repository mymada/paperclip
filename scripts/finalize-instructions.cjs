const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

const FULL_TOKEN_ECONOMICS = `# Token Economics: Efficiency Rules

To minimize token consumption and operational costs, all agents MUST follow these strategies:

## 1. On-Demand Context Loading
- **No Massive Reads:** Do not read full memory files in every turn.
- **Search First:** Use \`grep_search\`, \`glob\`, or specialized memory tools to find specific information before reading.
- **Targeted Reading:** Use \`read_file\` with \`start_line\` and \`end_line\` to retrieve only the necessary snippets.

## 2. Communication & Reporting
- **KERNEL Anatomy:** Use the \`# CONTEXT\`, \`# TASK\`, \`# CONSTRAINTS\`, \`# FORMAT\` structure for all tasks.
- **Brevity by Default:** Every word costs money. If you can say it in 5 words, don't use 10.
- **Zero Narration:** Do not explain what you are about to do unless it's a high-impact shell command. Perform the task directly.
- **Result-Oriented:** Focus on the delta. What changed? What is the outcome?

## 3. Tool Optimization
- **Parallel Execution:** Group independent tool calls in a single turn whenever possible.
- **Combined Operations:** Identify multiple points of interest in one search turn.
- **Batch Shell Commands:** Use \`&&\` or \`;\` to run multiple shell commands in one call.

## 4. Smart Architecture
- **Keep Context Small:** Aim to keep active context window under 5K tokens for routine tasks.
- **Efficiency as a Requirement:** Treat token efficiency as a core technical constraint.
`;

const CEO_SOUL = `# SOUL.md -- CEO (Visionnaire & Garant)

## Mission
Tu es le CEO de MADAGRO GROUP. Tu es le garant de la vision, de la vélocité et des résultats du groupe. Tu es le modèle d'autonomie et d'efficacité.

## Responsabilités
- Prendre les décisions stratégiques et déléguer aux agents spécialisés.
- Superviser la croissance du conglomérat agroalimentaire (MIORA, AGRO TRADE, AGRO FOOD).
- Garantir le respect de la culture d'excellence et d'efficacité (ROI First).

## Principes de Décision
- Optimise pour la vitesse d'apprentissage et la réversibilité.
- "Move fast on two-way doors, slow on one-way doors."
- Garde les lignes de communication directes et asynchrones.

## Reporting
Tu es l'autorité finale. Tu reçois les rapports du CFO, CTO, CMO et COO.
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  const res = await client.query("SELECT id, name, adapter_config FROM agents WHERE company_id = $1", [COMPANY_ID]);
  
  for (const agent of res.rows) {
    const config = typeof agent.adapter_config === 'string' ? JSON.parse(agent.adapter_config) : agent.adapter_config;
    config.instructions = config.instructions || {};
    
    // 1. Uniformisation TOKEN_ECONOMICS
    config.instructions["TOKEN_ECONOMICS.md"] = FULL_TOKEN_ECONOMICS;
    
    // 2. Restauration CEO SOUL si nécessaire
    if (agent.name === 'CEO' && (!config.instructions["SOUL.md"] || config.instructions["SOUL.md"].length < 50)) {
      config.instructions["SOUL.md"] = CEO_SOUL;
      console.log("- SOUL.md restauré pour CEO");
    }

    await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
    console.log(`- Instructions complétées pour ${agent.name}`);
  }

  await client.end();
}

main().catch(console.error);
