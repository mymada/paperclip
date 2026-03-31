import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { MarkdownBody } from "./MarkdownBody";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ChevronRight, Download, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

function downloadFile(key: string, body: string) {
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${key}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DocumentPreviewModal({
  issueId,
  issueTitle,
  open,
  onOpenChange,
  initialKey,
}: {
  issueId: string;
  issueTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKey?: string;
}) {
  const { data: documents, isLoading } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => issuesApi.listDocuments(issueId),
    enabled: open,
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey ?? null);

  const activeKey = selectedKey ?? documents?.[0]?.key ?? null;
  const activeDoc = documents?.find((d) => d.key === activeKey) ?? documents?.[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col gap-0 overflow-hidden"
        showCloseButton={true}
      >
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{issueTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Chargement des documents…
          </div>
        )}

        {!isLoading && (!documents || documents.length === 0) && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Aucun document produit pour cette issue.
          </div>
        )}

        {!isLoading && documents && documents.length > 0 && (
          <div className="flex flex-1 min-h-0">
            {/* Sidebar — liste des documents */}
            {documents.length > 1 && (
              <aside className="w-52 shrink-0 border-r border-border flex flex-col overflow-y-auto bg-muted/30">
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Documents
                </p>
                {documents.map((doc) => (
                  <button
                    key={doc.key}
                    onClick={() => setSelectedKey(doc.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      activeKey === doc.key
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">
                      {doc.title ?? doc.key}
                    </span>
                    {activeKey === doc.key && (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                  </button>
                ))}
              </aside>
            )}

            {/* Contenu du document */}
            <div className="flex-1 min-w-0 flex flex-col">
              {activeDoc && (
                <>
                  {/* Entête du document */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
                    <div>
                      <p className="text-sm font-semibold">
                        {activeDoc.title ?? activeDoc.key}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        v{activeDoc.latestRevisionNumber} · modifié{" "}
                        {new Date(activeDoc.updatedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(activeDoc.key, activeDoc.body)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </button>
                  </div>

                  {/* Corps markdown */}
                  <div className="flex-1 overflow-y-auto px-10 py-8">
                    <MarkdownBody className="prose prose-base dark:prose-invert max-w-3xl mx-auto">
                      {activeDoc.body}
                    </MarkdownBody>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
