import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  EXPORT_NAMES,
  JOB_KEYS,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  TOOL_NAMES,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Corporate Memory",
  description: "Mémoire Vive d'Entreprise — Automatically captures knowledge from done issues and makes it searchable by agents. Organises documents in a 2-level taxonomy (category / docType).",
  author: "Paperclip",
  categories: ["automation", "ui"],
  capabilities: [
    "issues.read",
    "issue.comments.read",
    "companies.read",
    "projects.read",
    "plugin.state.read",
    "plugin.state.write",
    "events.subscribe",
    "jobs.schedule",
    "agent.tools.register",
    "agents.read",
    "agent.sessions.create",
    "agent.sessions.send",
    "agent.sessions.close",
    "ui.page.register",
    "ui.sidebar.register",
    "ui.dashboardWidget.register",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      synthesisAgentId: {
        type: "string",
        title: "ID de l'agent de synthèse",
        description:
          "UUID de l'agent Paperclip à utiliser pour synthétiser les documents capturés. Si vide, le contenu brut de l'issue est conservé.",
      },
    },
  },
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  jobs: [
    {
      jobKey: JOB_KEYS.weeklyDigest,
      displayName: "Weekly Memory Digest",
      description: "Computes per-category document counts and logs a weekly summary every Monday at 9am.",
      schedule: "0 9 * * 1",
    },
  ],
  tools: [
    {
      name: TOOL_NAMES.search,
      displayName: "Corporate Memory Search",
      description: "Search the corporate memory by keyword. Optionally filter by category (e.g. juridique, strategique, financier, technique, rapports, gouvernance, operations, rh) and/or docType (e.g. statuts, contrats, budget, dat, sop).",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search terms to match against title, summary and tags.",
          },
          category: {
            type: "string",
            description: "Optional taxonomy category filter: juridique, strategique, financier, technique, rapports, gouvernance, operations, or rh.",
          },
          docType: {
            type: "string",
            description: "Optional document type filter within the category (e.g. statuts, contrats, budget, dat, sop, decision, pv).",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 10, max 10).",
          },
        },
        required: ["query"],
      },
    },
    {
      name: TOOL_NAMES.get,
      displayName: "Corporate Memory Get",
      description: "Retrieve the full content of a corporate memory document by ID.",
      parametersSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "UUID of the memory document to retrieve." },
        },
        required: ["id"],
      },
    },
    {
      name: TOOL_NAMES.list,
      displayName: "Corporate Memory List",
      description: "List all corporate memory entries, optionally filtered by category and/or docType.",
      parametersSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category filter: juridique, strategique, financier, technique, rapports, gouvernance, operations, or rh.",
          },
          docType: {
            type: "string",
            description: "Optional docType filter within the category.",
          },
        },
      },
    },
    {
      name: TOOL_NAMES.upsert,
      displayName: "Corporate Memory Upsert",
      description: "Create or update a corporate memory document. Matches by title within the same category. Use the taxonomy categories and docTypes.",
      parametersSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Taxonomy category: juridique, strategique, financier, technique, rapports, gouvernance, operations, or rh.",
          },
          docType: {
            type: "string",
            description: "Document type within the category (e.g. statuts, contrats, budget, dat, sop, decision, pv, rapport_board).",
          },
          title: { type: "string", description: "Title of the memory document." },
          body: { type: "string", description: "Full markdown content of the document." },
          status: {
            type: "string",
            description: "Document status: draft, validated, or archived. Defaults to draft.",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of tags.",
          },
          sourceIssueId: {
            type: "string",
            description: "Optional UUID of the source issue.",
          },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issueId: { type: "string", description: "UUID of the source issue." },
                identifier: { type: "string", description: "Issue identifier e.g. MG-001." },
                title: { type: "string", description: "Title of the source issue or document." },
              },
            },
            description: "Optional list of source references (issues or documents) this document was synthesized from.",
          },
        },
        required: ["category", "title", "body"],
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Corporate Memory",
        exportName: EXPORT_NAMES.page,
        routePath: PAGE_ROUTE,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "Corporate Memory",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
      {
        type: "sidebar",
        id: SLOT_IDS.sidebar,
        displayName: "Mémoire d'Entreprise",
        exportName: EXPORT_NAMES.sidebar,
      },
    ],
  },
};

export default manifest;
