import { useState, type CSSProperties, type FormEvent } from "react";
import { usePluginAction, usePluginData, type PluginSidebarProps } from "@paperclipai/plugin-sdk/ui";
import {
  CATEGORIES,
  DATA_KEYS,
  PAGE_ROUTE,
  STATUS_COLORS,
  STATUS_LABELS,
  TAXONOMY,
  type MemoryCategory,
  type MemoryStatus,
} from "../constants.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  docType: string;
  docTypeLabel: string;
  title: string;
  summary: string;
  status: MemoryStatus;
  version: number;
  sourceIssueId: string;
  sourceIssueTitle: string;
  sourceIssueIdentifier: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  sources?: Array<{ issueId?: string; identifier?: string; title: string }>;
}

interface MemoryDocument extends MemoryEntry {
  body: string;
  changelog: Array<{ at: string; summary: string; version: number }>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    height: "100%",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    color: "#1a1a1a",
    background: "#f5f5f5",
    overflow: "hidden",
  },
  sidebar: {
    width: "230px",
    minWidth: "230px",
    background: "#fff",
    borderRight: "1px solid #e0e0e0",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  sidebarHeader: {
    padding: "16px 12px 8px",
    fontWeight: 700,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#666",
  },
  // "All" row
  allItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    margin: "0 4px",
  },
  allItemActive: {
    background: "#f0f0ff",
    color: "#5050ff",
    fontWeight: 600,
  },
  // Category row (level 1)
  categoryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 12px 7px 8px",
    cursor: "pointer",
    borderRadius: "4px",
    margin: "0 4px",
    userSelect: "none",
  },
  categoryRowActive: {
    background: "#f0f0ff",
    color: "#5050ff",
  },
  categoryLeft: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 600,
    fontSize: "13px",
  },
  chevron: {
    fontSize: "10px",
    color: "#aaa",
    transition: "transform 0.15s",
    display: "inline-block",
  },
  chevronOpen: {
    transform: "rotate(90deg)",
  },
  // DocType row (level 2)
  docTypeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 10px 5px 28px",
    cursor: "pointer",
    borderRadius: "4px",
    margin: "0 4px",
    fontSize: "12px",
    color: "#555",
  },
  docTypeRowActive: {
    background: "#eeeeff",
    color: "#4040dd",
    fontWeight: 600,
  },
  badge: {
    background: "#e0e0e0",
    borderRadius: "8px",
    padding: "1px 6px",
    fontSize: "11px",
    color: "#555",
    minWidth: "18px",
    textAlign: "center" as const,
  },
  badgeActive: {
    background: "#c8c8ff",
    color: "#3030cc",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    padding: "12px 16px",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    padding: "7px 12px",
    border: "1px solid #d0d0d0",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  buttonPrimary: {
    padding: "7px 14px",
    background: "#5050ff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "12px 16px",
    cursor: "pointer",
  },
  cardActive: {
    borderColor: "#5050ff",
    boxShadow: "0 0 0 2px #e0e0ff",
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: "4px",
  },
  cardMeta: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "6px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  cardSummary: {
    fontSize: "13px",
    color: "#444",
    lineHeight: 1.4,
  },
  tags: {
    marginTop: "6px",
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
  },
  tag: {
    background: "#f0f0f0",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "11px",
    color: "#555",
  },
  detail: {
    borderTop: "1px solid #e8e8e8",
    marginTop: "10px",
    paddingTop: "10px",
  },
  detailMetaTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginBottom: "12px",
    fontSize: "12px",
  },
  pre: {
    background: "#f8f8f8",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    padding: "12px",
    overflowX: "auto",
    fontSize: "13px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  empty: {
    textAlign: "center",
    color: "#aaa",
    padding: "40px 20px",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    background: "#fff",
    borderRadius: "10px",
    padding: "24px",
    width: "560px",
    maxWidth: "95vw",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },
  modalTitle: {
    fontWeight: 700,
    fontSize: "16px",
    marginBottom: "4px",
  },
  label: {
    fontWeight: 600,
    fontSize: "12px",
    color: "#555",
    marginBottom: "4px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "monospace",
    minHeight: "120px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  buttonSecondary: {
    padding: "7px 14px",
    background: "#fff",
    color: "#333",
    border: "1px solid #ccc",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
};

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: MemoryStatus }) {
  const color = STATUS_COLORS[status] ?? "#888";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#fff",
        background: color,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Document detail view
// ---------------------------------------------------------------------------

function DocumentDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: doc } = usePluginData<MemoryDocument | null>(DATA_KEYS.memoryDoc, { id });

  if (!doc) {
    return (
      <div style={styles.detail}>
        <p style={{ color: "#aaa", fontSize: "13px" }}>Chargement...</p>
      </div>
    );
  }

  const catInfo = TAXONOMY[doc.category];

  return (
    <div style={styles.detail}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{doc.title}</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <StatusBadge status={doc.status ?? "draft"} />
            <span style={{ fontSize: "12px", color: "#888" }}>v{doc.version}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ ...styles.buttonSecondary, padding: "4px 10px", fontSize: "12px" }}
        >
          Fermer
        </button>
      </div>

      {/* Metadata table */}
      <table style={styles.detailMetaTable}>
        <tbody>
          <tr>
            <td style={{ color: "#888", paddingRight: "12px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
              Catégorie
            </td>
            <td style={{ paddingBottom: "4px" }}>
              {catInfo ? `${catInfo.icon} ${catInfo.label}` : doc.category}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#888", paddingRight: "12px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
              Type
            </td>
            <td style={{ paddingBottom: "4px" }}>{doc.docTypeLabel ?? doc.docType}</td>
          </tr>
          {doc.sourceIssueIdentifier && (
            <tr>
              <td style={{ color: "#888", paddingRight: "12px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
                Source
              </td>
              <td style={{ paddingBottom: "4px" }}>
                {doc.sourceIssueIdentifier}
                {doc.sourceIssueTitle ? ` — ${doc.sourceIssueTitle}` : ""}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ color: "#888", paddingRight: "12px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
              Mis à jour
            </td>
            <td style={{ paddingBottom: "4px" }}>
              {new Date(doc.updatedAt).toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#888", paddingRight: "12px", whiteSpace: "nowrap" }}>Créé</td>
            <td>{new Date(doc.createdAt).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {doc.sources && doc.sources.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sources ({doc.sources.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {doc.sources.map((src: any, i: number) => (
              <div key={i} style={{ fontSize: "12px", background: "#f5f5f5", borderRadius: "4px", padding: "4px 8px", display: "flex", gap: "8px", alignItems: "center" }}>
                {src.identifier && (
                  <span style={{ fontWeight: 600, color: "#555", minWidth: "60px" }}>{src.identifier}</span>
                )}
                <span style={{ color: "#333" }}>{src.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <pre style={styles.pre}>{doc.body}</pre>

      {doc.changelog.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "4px" }}>
            Historique
          </div>
          {doc.changelog.map((entry, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#888" }}>
              {new Date(entry.at).toLocaleString()} — {entry.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form modal
// ---------------------------------------------------------------------------

interface CreateFormProps {
  onClose: () => void;
  onSaved: () => void;
}

function CreateForm({ onClose, onSaved }: CreateFormProps) {
  const [category, setCategory] = useState<string>("gouvernance");
  const [docType, setDocType] = useState<string>("decision");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upsertAction = usePluginAction("memory-upsert");

  function handleCategoryChange(val: string) {
    setCategory(val);
    // Reset docType to the first type of the newly selected category
    const types = Object.keys(TAXONOMY[val]?.types ?? {});
    setDocType(types[0] ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Le titre et le contenu sont requis.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await upsertAction({
        category,
        docType,
        title: title.trim(),
        body: body.trim(),
        status,
        tags: tags.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const docTypes = Object.entries(TAXONOMY[category]?.types ?? {});

  return (
    <div
      style={styles.modal}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={styles.modalBox}>
        <div style={styles.modalTitle}>Nouveau document mémoire</div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Catégorie</label>
              <select
                style={styles.select}
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {CATEGORIES.map((cat) => {
                  const info = TAXONOMY[cat];
                  return (
                    <option key={cat} value={cat}>
                      {info?.icon} {info?.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Type de document</label>
              <select
                style={styles.select}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {docTypes.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={styles.label}>Statut</label>
            <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Brouillon</option>
              <option value="validated">Validé</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Titre</label>
            <input
              style={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du document"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Contenu (Markdown)</label>
            <textarea
              style={styles.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"# Titre\n\nContenu en markdown..."}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Tags (séparés par des virgules)</label>
            <input
              style={styles.input}
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2"
            />
          </div>

          {error && <div style={{ color: "#c00", fontSize: "13px" }}>{error}</div>}
          <div style={styles.modalActions}>
            <button type="button" style={styles.buttonSecondary} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" style={styles.buttonPrimary} disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Taxonomy sidebar tree
// ---------------------------------------------------------------------------

type SidebarFilter =
  | { kind: "all" }
  | { kind: "category"; category: MemoryCategory }
  | { kind: "docType"; category: MemoryCategory; docType: string };

interface TaxonomySidebarProps {
  filter: SidebarFilter;
  stats: Record<string, number> | null | undefined;
  onSelect: (f: SidebarFilter) => void;
}

function TaxonomySidebar({ filter, stats, onSelect }: TaxonomySidebarProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const totalAll = stats ? CATEGORIES.reduce((sum, cat) => sum + (stats[cat] ?? 0), 0) : 0;
  const isAll = filter.kind === "all";

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>Catégories</div>

      {/* All */}
      <div
        style={{ ...styles.allItem, ...(isAll ? styles.allItemActive : {}) }}
        onClick={() => onSelect({ kind: "all" })}
      >
        <span>Tous</span>
        <span style={{ ...styles.badge, ...(isAll ? styles.badgeActive : {}) }}>
          {totalAll}
        </span>
      </div>

      {/* Per category */}
      {CATEGORIES.map((cat) => {
        const catInfo = TAXONOMY[cat];
        const catCount = stats?.[cat] ?? 0;
        const isOpen = openCategories[cat] ?? false;
        const isCatActive =
          filter.kind === "category" && filter.category === cat;
        const hasActiveType =
          filter.kind === "docType" && filter.category === cat;

        return (
          <div key={cat}>
            <div
              style={{
                ...styles.categoryRow,
                ...(isCatActive || hasActiveType ? styles.categoryRowActive : {}),
              }}
            >
              {/* Chevron to expand/collapse */}
              <span
                style={{ ...styles.chevron, ...(isOpen ? styles.chevronOpen : {}) }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat);
                }}
              >
                ▶
              </span>
              {/* Category label — click to filter by category */}
              <div
                style={{ ...styles.categoryLeft, flex: 1 }}
                onClick={() => {
                  onSelect({ kind: "category", category: cat });
                  // Also auto-open
                  setOpenCategories((prev) => ({ ...prev, [cat]: true }));
                }}
              >
                <span>{catInfo?.icon}</span>
                <span style={{ fontSize: "12px" }}>{catInfo?.label}</span>
              </div>
              <span
                style={{
                  ...styles.badge,
                  ...(isCatActive ? styles.badgeActive : {}),
                }}
              >
                {catCount}
              </span>
            </div>

            {/* DocType sub-rows */}
            {isOpen &&
              Object.entries(catInfo?.types ?? {}).map(([dt, dtLabel]) => {
                const dtCount = stats?.[`${cat}/${dt}`] ?? 0;
                const isDtActive =
                  filter.kind === "docType" &&
                  filter.category === cat &&
                  filter.docType === dt;
                return (
                  <div
                    key={dt}
                    style={{
                      ...styles.docTypeRow,
                      ...(isDtActive ? styles.docTypeRowActive : {}),
                    }}
                    onClick={() => onSelect({ kind: "docType", category: cat, docType: dt })}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "140px",
                      }}
                      title={dtLabel}
                    >
                      {dtLabel}
                    </span>
                    <span
                      style={{
                        ...styles.badge,
                        ...(isDtActive ? styles.badgeActive : {}),
                      }}
                    >
                      {dtCount}
                    </span>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function CorporateMemoryPage() {
  const [filter, setFilter] = useState<SidebarFilter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const dataParams: Record<string, unknown> = { _refresh: refreshKey };
  if (filter.kind === "category") dataParams["category"] = filter.category;
  if (filter.kind === "docType") {
    dataParams["category"] = filter.category;
    dataParams["docType"] = filter.docType;
  }

  const { data: allEntries } = usePluginData<MemoryEntry[]>(DATA_KEYS.memoryList, dataParams);
  const { data: stats } = usePluginData<Record<string, number>>(DATA_KEYS.memoryStats, {
    _refresh: refreshKey,
  });

  const entries = allEntries ?? [];

  const filtered = query.trim()
    ? entries.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : entries;

  function handleFilterSelect(f: SidebarFilter) {
    setFilter(f);
    setExpandedId(null);
    setQuery("");
  }

  function handleCardClick(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleSaved() {
    setShowCreate(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div style={styles.container}>
      <TaxonomySidebar filter={filter} stats={stats} onSelect={handleFilterSelect} />

      {/* Main area */}
      <div style={styles.main}>
        <div style={styles.toolbar}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Rechercher dans la mémoire..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button style={styles.buttonPrimary} onClick={() => setShowCreate(true)}>
            + Nouveau
          </button>
        </div>

        <div style={styles.list}>
          {filtered.length === 0 && (
            <div style={styles.empty}>
              {query
                ? "Aucun résultat pour cette recherche."
                : "Aucun document dans cette catégorie."}
            </div>
          )}
          {filtered.map((entry) => {
            const catInfo = TAXONOMY[entry.category];
            return (
              <div
                key={entry.id}
                style={{
                  ...styles.card,
                  ...(expandedId === entry.id ? styles.cardActive : {}),
                }}
                onClick={() => handleCardClick(entry.id)}
              >
                <div style={styles.cardTitle}>{entry.title}</div>
                <div style={styles.cardMeta}>
                  <StatusBadge status={entry.status ?? "draft"} />
                  <span>
                    {catInfo?.icon} {catInfo?.label}
                  </span>
                  <span style={{ color: "#bbb" }}>·</span>
                  <span>{entry.docTypeLabel ?? entry.docType}</span>
                  {entry.sourceIssueIdentifier ? (
                    <>
                      <span style={{ color: "#bbb" }}>·</span>
                      <span>{entry.sourceIssueIdentifier}</span>
                    </>
                  ) : null}
                  <span style={{ color: "#bbb" }}>·</span>
                  <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                  {entry.version > 1 ? (
                    <span style={{ color: "#bbb" }}>v{entry.version}</span>
                  ) : null}
                </div>
                <div style={styles.cardSummary}>
                  {entry.summary.slice(0, 160)}
                  {entry.summary.length > 160 ? "…" : ""}
                </div>
                {entry.tags.length > 0 && (
                  <div style={styles.tags}>
                    {entry.tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {expandedId === entry.id && (
                  <DocumentDetail id={entry.id} onClose={() => setExpandedId(null)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && <CreateForm onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard widget
// ---------------------------------------------------------------------------

export function CorporateMemoryDashboardWidget() {
  const { data: stats } = usePluginData<Record<string, number>>(DATA_KEYS.memoryStats, {});

  const total = stats
    ? CATEGORIES.reduce((sum, cat) => sum + (stats[cat] ?? 0), 0)
    : 0;

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui, sans-serif", fontSize: "13px" }}>
      <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "12px" }}>
        Corporate Memory
      </div>
      <div style={{ fontWeight: 600, fontSize: "22px", color: "#5050ff", marginBottom: "12px" }}>
        {total} documents
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {CATEGORIES.map((cat) => {
          const info = TAXONOMY[cat];
          const count = stats?.[cat] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={cat}
              style={{
                background: "#f0f0f8",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                color: "#555",
              }}
            >
              {info?.icon} {info?.label}: <strong>{count}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar link — shown in the Paperclip main navigation
// ---------------------------------------------------------------------------

function hostPath(companyPrefix: string | null | undefined, suffix: string): string {
  return companyPrefix ? `/${companyPrefix}${suffix}` : suffix;
}

export function CorporateMemorySidebarLink({ context }: PluginSidebarProps) {
  const href = hostPath(context.companyPrefix, `/${PAGE_ROUTE}`);
  const isActive = typeof window !== "undefined" && window.location.pathname === href;
  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-[var(--radius-sm)] ${
        isActive
          ? "bg-accent text-foreground"
          : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="10" y1="7" x2="16" y2="7" />
        <line x1="10" y1="11" x2="16" y2="11" />
        <line x1="10" y1="15" x2="14" y2="15" />
      </svg>
      <span className="truncate">Mémoire d'Entreprise</span>
    </a>
  );
}
