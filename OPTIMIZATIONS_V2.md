# OPTIMIZATIONS V2.0 : Évolution "Native-Like" de Paperclip

Ce document détaille les optimisations techniques majeures apportées à Paperclip v0.3+, inspirées par l'architecture de Claude Code et conformes au standard **Business-Superpowers KERNEL v16.1**.

---

## 1. ARCHITECTURE GÉNÉRALE (KERNEL Layers)
L'évolution repose sur trois piliers fondamentaux pour garantir la vitesse (Velocity), le coût (Frugality) et l'isolation (Resilience).

- **Couche D (RELAY_PROTOCOL) :** Pont MCP Universel.
- **Couche H (HIGH_VELOCITY) :** Swarm Manager via Git Worktrees.
- **Couche I (UNIVERSAL_CONTEXT) :** Optimisation du Prompt Caching pour Claude.

---

## 2. PONT MCP UNIVERSEL (mcp-bridge.ts)
Paperclip supporte désormais nativement le **Model Context Protocol (MCP)**. Tous les agents, quel que soit leur CLI (Claude, Gemini, etc.), peuvent désormais accéder à un écosystème d'outils externes.

### Caractéristiques :
- **Namespacing :** Les outils MCP sont exposés sous la forme `mcp.<serverId>:<toolName>`.
- **Interopérabilité :** Compatible avec n'importe quel serveur MCP (SQL, Slack, Google Search, etc.).
- **Sécurité :** Isolation des processus via `StdioClientTransport`.

### Utilisation :
Le service `mcpBridgeService` gère dynamiquement la connexion et le routage des appels d'outils.
```typescript
await mcpBridgeService.connectServer({
  id: "github-server",
  name: "GitHub MCP",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"]
});
```

---

## 3. OPTIMISATION CLAUDE-LOCAL (Prompt Caching)
L'adaptateur `claude_local` a été optimisé pour réduire les coûts et la latence en utilisant les fonctionnalités internes du binaire Claude Code.

### Améliorations :
- **Prompt Caching :** Support de la directive `{{cache_breakpoint}}`. L'adaptateur injecte des marqueurs `ephemeral` dans le prompt système, permettant de réutiliser le contexte entre les "heartbeats".
- **Structured IO :** Utilisation du flag `--output-format stream-json` pour une communication machine-to-machine fiable.
- **Gestion des Sessions :** Détection automatique des sessions expirées et mécanisme de "retry" transparent.

---

## 4. SWARM MANAGER (Isolation par Worktree)
Inspiré du "Coordinator Mode" de Claude Code, ce module permet aux agents de déléguer des tâches à des "Workers" en toute sécurité.

### Fonctionnement :
- **Isolation Totale :** Chaque worker est créé dans un **Git Worktree éphémère** situé dans `.paperclip/swarm/<worker-id>`.
- **Gestion de Branche :** Une branche dédiée est créée pour chaque tâche, permettant une revue avant fusion (Merge) ou un nettoyage (Cleanup) sans trace.
- **Généricité :** Le système de Worktree est indépendant du CLI utilisé par le worker.

---

## 5. VALIDATION TECHNIQUE (Tests)
Les fonctionnalités ont été validées via une suite de tests unitaires et d'intégration (`vitest`) :

1.  **`mcp-bridge.test.ts`** :
    - [PASS] Connexion et enregistrement des serveurs.
    - [PASS] Découverte dynamique des outils.
    - [PASS] Routage des appels avec namespaces.
2.  **`swarm-manager.test.ts`** :
    - [PASS] Initialisation de dépôts Git temporaires.
    - [PASS] Création de Worktrees fonctionnels.
    - [PASS] Nettoyage automatique des ressources (Worktree + Branche).

---

## 6. PROCHAINES ÉTAPES (Roadmap)
- **Phase 3 :** Intégration de l'interface utilisateur (UI) pour visualiser l'état des Worktrees du Swarm.
- **Phase 4 :** Support du protocole MCP via SSE (Server-Sent Events) pour les serveurs distants.

---
**[ARTIFACT: READY]**
**Statut : VALIDÉ par Business-Superpowers OS v16.1**
*Auteur : Gemini CLI v2026.3*
