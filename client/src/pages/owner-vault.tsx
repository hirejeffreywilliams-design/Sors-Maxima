import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Shield,
  Cpu,
  Building2,
  TrendingUp,
  Save,
  Edit3,
  X,
  Clock,
  Lock,
  FileText,
  ChevronRight,
} from "lucide-react";

interface VaultDocument {
  id: number;
  sectionKey: string;
  title: string;
  content: string;
  updatedAt: string;
}

const SECTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  "founder-story": {
    icon: BookOpen,
    color: "text-amber-400",
    description: "The personal origin story of Sors Maxima",
  },
  "ip-registry": {
    icon: Shield,
    color: "text-blue-400",
    description: "Complete intellectual property and proprietary asset inventory",
  },
  "technical-architecture": {
    icon: Cpu,
    color: "text-purple-400",
    description: "Full front-end and back-end stack documentation with engine inventory",
  },
  "business-structure": {
    icon: Building2,
    color: "text-green-400",
    description: "Legal entity recommendations, regulatory positioning, and acquisition readiness",
  },
  "valuation-projections": {
    icon: TrendingUp,
    color: "text-rose-400",
    description: "5-year revenue projections, valuation multiples, and acquisition target range",
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = html.split("\n");
  const result: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inOrderedList = false;
  let orderedItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const headerCells = tableRows[0]
      .split("|")
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map((c) => `<th class="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">${c.trim()}</th>`)
      .join("");
    const bodyRows = tableRows
      .slice(2)
      .map((row) => {
        const cells = row
          .split("|")
          .filter((_, i, arr) => i > 0 && i < arr.length - 1)
          .map((c) => `<td class="px-4 py-2 text-sm border-b border-border/30">${processInline(c.trim())}</td>`)
          .join("");
        return `<tr class="hover:bg-muted/20 transition-colors">${cells}</tr>`;
      })
      .join("");
    result.push(
      `<div class="overflow-x-auto my-4 rounded-lg border border-border/40"><table class="w-full"><thead><tr class="bg-muted/30">${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
    );
    tableRows = [];
    inTable = false;
  }

  function flushList() {
    if (listItems.length === 0) return;
    result.push(`<ul class="list-disc pl-6 my-3 space-y-1">${listItems.join("")}</ul>`);
    listItems = [];
    inList = false;
  }

  function flushOrdered() {
    if (orderedItems.length === 0) return;
    result.push(`<ol class="list-decimal pl-6 my-3 space-y-1">${orderedItems.join("")}</ol>`);
    orderedItems = [];
    inOrderedList = false;
  }

  function flushCode() {
    if (codeLines.length === 0) return;
    const code = codeLines.join("\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    result.push(`<pre class="bg-muted/50 border border-border/40 rounded-lg p-4 my-4 overflow-x-auto text-xs font-mono text-foreground whitespace-pre">${code}</pre>`);
    codeLines = [];
    inCode = false;
  }

  function processInline(s: string): string {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-primary">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      if (inCode) {
        flushCode();
        continue;
      }
      if (inTable) flushTable();
      if (inList) flushList();
      if (inOrderedList) flushOrdered();
      inCode = true;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      if (inList) flushList();
      if (inOrderedList) flushOrdered();
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (/^- /.test(line)) {
      if (inOrderedList) flushOrdered();
      inList = true;
      listItems.push(`<li class="text-sm leading-relaxed text-muted-foreground">${processInline(line.slice(2))}</li>`);
      continue;
    } else if (inList && line.trim() === "") {
      flushList();
    } else if (inList) {
      flushList();
    }

    if (/^\d+\. /.test(line)) {
      if (inList) flushList();
      inOrderedList = true;
      orderedItems.push(`<li class="text-sm leading-relaxed text-muted-foreground">${processInline(line.replace(/^\d+\. /, ""))}</li>`);
      continue;
    } else if (inOrderedList && line.trim() === "") {
      flushOrdered();
    } else if (inOrderedList && !/^\d+\. /.test(line)) {
      flushOrdered();
    }

    if (line.startsWith("# ")) {
      result.push(`<h1 class="text-2xl font-bold text-foreground mt-6 mb-3">${processInline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      result.push(`<h2 class="text-xl font-semibold text-foreground mt-8 mb-3 pb-2 border-b border-border/40">${processInline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      result.push(`<h3 class="text-base font-semibold text-foreground mt-6 mb-2">${processInline(line.slice(4))}</h3>`);
    } else if (line.startsWith("#### ")) {
      result.push(`<h4 class="text-sm font-semibold text-foreground mt-4 mb-1">${processInline(line.slice(5))}</h4>`);
    } else if (line.startsWith("---")) {
      result.push(`<hr class="border-border/40 my-6" />`);
    } else if (line.trim() === "") {
      result.push(`<div class="h-2"></div>`);
    } else {
      result.push(`<p class="text-sm leading-relaxed text-muted-foreground my-1">${processInline(line)}</p>`);
    }
  }

  if (inTable) flushTable();
  if (inList) flushList();
  if (inOrderedList) flushOrdered();
  if (inCode) flushCode();

  return result.join("\n");
}

function VaultDocumentViewer({ doc }: { doc: VaultDocument }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("PATCH", `/api/vault/documents/${doc.sectionKey}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/documents"] });
      setIsEditing(false);
      toast({ title: "Saved", description: "Document updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditContent(doc.content);
  }, [doc.content]);

  function handleSave() {
    if (editContent.trim() === doc.content.trim()) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate(editContent);
  }

  function handleCancel() {
    setEditContent(doc.content);
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">{doc.title}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Last edited {formatRelativeTime(doc.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-1.5 text-xs"
                data-testid="button-vault-cancel"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-1.5 text-xs"
                data-testid="button-vault-save"
              >
                <Save className="h-3.5 w-3.5" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 text-xs"
              data-testid="button-vault-edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <div className="h-full flex flex-col p-4 gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <Edit3 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Editing in markdown — headings (#), bold (**text**), tables, and lists are all supported.</span>
            </div>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full bg-background border border-border/60 rounded-lg p-4 text-sm font-mono leading-relaxed text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              data-testid="textarea-vault-content"
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className="h-full overflow-y-auto px-6 py-4 prose-custom"
            data-testid="vault-document-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
          />
        )}
      </div>
    </div>
  );
}

export default function OwnerVault() {
  const [activeSectionKey, setActiveSectionKey] = useState<string>("founder-story");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: docs, isLoading, error } = useQuery<VaultDocument[]>({
    queryKey: ["/api/vault/documents"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vault/seed", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/documents"] });
    },
    onError: () => {
      toast({ title: "Seed error", description: "Failed to seed vault documents.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (docs && docs.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [docs]);

  const activeDoc = docs?.find((d) => d.sectionKey === activeSectionKey);

  const orderedSections = [
    "founder-story",
    "ip-registry",
    "technical-architecture",
    "business-structure",
    "valuation-projections",
  ];

  const sortedDocs = docs
    ? [...docs].sort(
        (a, b) => orderedSections.indexOf(a.sectionKey) - orderedSections.indexOf(b.sectionKey)
      )
    : [];

  if (isLoading || seedMutation.isPending) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="w-64 border-r border-border/40 p-4 space-y-2 shrink-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center space-y-2">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">Unable to load vault documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <aside
        className="w-64 border-r border-border/40 bg-muted/5 flex flex-col shrink-0"
        data-testid="vault-sidebar"
      >
        <div className="px-4 py-5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <div>
              <h1 className="font-bold text-sm text-foreground">Owner Vault</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Confidential — Admin Only</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sortedDocs.map((doc) => {
            const meta = SECTION_META[doc.sectionKey];
            const Icon = meta?.icon ?? FileText;
            const isActive = doc.sectionKey === activeSectionKey;
            return (
              <button
                key={doc.sectionKey}
                onClick={() => setActiveSectionKey(doc.sectionKey)}
                className={`w-full text-left rounded-lg px-3 py-3 transition-all group ${
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
                data-testid={`vault-nav-${doc.sectionKey}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-primary" : meta?.color ?? "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-tight ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {doc.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                      {meta?.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-3 w-3 text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-400 leading-tight">
              Protected — not visible to members
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {activeDoc ? (
          <VaultDocumentViewer key={activeDoc.sectionKey} doc={activeDoc} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">Select a section from the sidebar.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
