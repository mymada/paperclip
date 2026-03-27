const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  const res = await client.query("SELECT id, name, role, reports_to FROM agents WHERE company_id = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a'");
  const agents = res.rows;
  await client.end();

  const agentMap = new Map(agents.map(a => [a.id, { ...a, children: [] }]));

  agents.forEach(a => {
    if (a.reports_to && agentMap.has(a.reports_to)) {
      agentMap.get(a.reports_to).children.push(agentMap.get(a.id));
    }
  });

  function printTree(nodes, indent = '') {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      console.log(`${indent}${isLast ? '└── ' : '├── '}${node.name} (${node.role}) [ID: ${node.id.split('-')[0]}]`);
      const childIndent = indent + (isLast ? '    ' : '│   ');
      printTree(node.children, childIndent);
    }
  }

  const roots = [];
  agentMap.forEach(node => {
    // Si l'agent n'a pas de manager ou si son manager n'est pas dans cette compagnie
    if (!node.reports_to || !agentMap.has(node.reports_to)) {
      roots.push(node);
    }
  });

  console.log("Current Organization Chart:");
  printTree(roots);
}

main().catch(console.error);
