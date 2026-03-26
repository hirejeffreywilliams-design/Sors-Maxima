import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import {
  BookOpen, Plus, Search, Pin, PinOff, Pencil, Trash2, Trash,
  Tag, Trophy, Calendar, ChevronDown, X, Filter, FileText,
  TrendingUp, Users, Layers, Zap, StickyNote
} from "lucide-react";

interface ResearchNote {
  id: number;
  user_id: number;
  title: string;
  content: string;
  note_type: string;
  sport: string | null;
  related_game: string | null;
  related_pick: string | null;
  related_team: string | null;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const NOTE_TYPES = [
  { value: "general",     label: "General Research",  icon: FileText,    color: "text-blue-400" },
  { value: "pick",        label: "Pick Analysis",     icon: TrendingUp,  color: "text-green-400" },
  { value: "team",        label: "Team Notes",        icon: Users,       color: "text-purple-400" },
  { value: "parlay",      label: "Parlay Build",      icon: Layers,      color: "text-yellow-400" },
  { value: "game",        label: "Game Notes",        icon: Trophy,      color: "text-orange-400" },
  { value: "line",        label: "Line Movement",     icon: Zap,         color: "text-red-400" },
];

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF", "MMA/UFC", "Soccer", "Other"];

const SPORT_COLORS: Record<string, string> = {
  NBA: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  NFL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  NHL: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  MLB: "bg-red-500/20 text-red-300 border-red-500/30",
  NCAAB: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  NCAAF: "bg-green-500/20 text-green-300 border-green-500/30",
  "MMA/UFC": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Soccer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function getNoteTypeInfo(type: string) {
  return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0];
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const EMPTY_FORM = {
  title: "",
  content: "",
  note_type: "general",
  sport: "",
  related_game: "",
  related_pick: "",
  related_team: "",
  tags: "",
  pinned: false,
};

export default function ResearchNotes() {
  useSEO({ title: "Research Notes — Sors Maxima" });
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ResearchNote | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const notesQuery = useQuery<ResearchNote[]>({
    queryKey: ["/api/research/notes"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/research/notes", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/notes"] });
      setIsEditorOpen(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Note saved", description: "Your research note has been saved." });
    },
    onError: () => toast({ title: "Failed to save note", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/research/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/notes"] });
      setIsEditorOpen(false);
      setEditingNote(null);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Note updated" });
    },
    onError: () => toast({ title: "Failed to update note", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/research/notes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/notes"] });
      setDeleteNoteId(null);
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/research/notes", { method: "DELETE" }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/notes"] });
      setShowClearAll(false);
      toast({ title: "All notes cleared", description: `${data.deleted} note${data.deleted !== 1 ? "s" : ""} deleted.` });
    },
    onError: () => toast({ title: "Failed to clear notes", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      apiRequest(`/api/research/notes/${id}`, { method: "PATCH", body: JSON.stringify({ pinned }) }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/research/notes"] }),
  });

  const notes = notesQuery.data || [];

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (filterSport !== "all" && n.sport !== filterSport) return false;
      if (filterType !== "all" && n.note_type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.related_game || "").toLowerCase().includes(q) ||
          (n.related_pick || "").toLowerCase().includes(q) ||
          (n.related_team || "").toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notes, filterSport, filterType, searchQuery]);

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  function openCreate() {
    setEditingNote(null);
    setForm({ ...EMPTY_FORM });
    setIsEditorOpen(true);
  }

  function openEdit(note: ResearchNote) {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content,
      note_type: note.note_type,
      sport: note.sport || "",
      related_game: note.related_game || "",
      related_pick: note.related_pick || "",
      related_team: note.related_team || "",
      tags: note.tags.join(", "),
      pinned: note.pinned,
    });
    setIsEditorOpen(true);
  }

  function handleSave() {
    const tagsArr = form.tags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    const payload = {
      title: form.title || "Untitled Note",
      content: form.content,
      note_type: form.note_type,
      sport: form.sport || null,
      related_game: form.related_game || null,
      related_pick: form.related_pick || null,
      related_team: form.related_team || null,
      tags: tagsArr,
      pinned: form.pinned,
    };
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" />
            Research Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save picks, stats, and analysis for your own parlay research. Your private notebook.
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1 hidden sm:block max-w-lg">
            Tap New Note to write analysis for any pick, game, or trend you're tracking. Tag notes by sport, note type, and related game so you can find them later. Use the search bar and filters to navigate your history. Notes are private — only you can see them.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {notes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearAll(true)}
              data-testid="button-clear-all-notes"
              className="gap-1.5 text-xs text-red-400 border-red-500/30"
            >
              <Trash className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
          <Button
            size="sm"
            onClick={openCreate}
            data-testid="button-new-note"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your notes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/60 border-border/50"
              data-testid="input-search-notes"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
            className={`gap-1.5 ${showFilters ? "bg-primary/10 border-primary/30" : ""}`}
          >
            <Filter className="h-4 w-4" />
            Filter
            {(filterSport !== "all" || filterType !== "all") && (
              <Badge className="h-4 text-[10px] px-1 bg-primary ml-0.5">
                {[filterSport !== "all", filterType !== "all"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-card/40 border border-border/40 rounded-lg">
            <Select value={filterSport} onValueChange={setFilterSport}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-card/60 border-border/50" data-testid="select-filter-sport">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-card/60 border-border/50" data-testid="select-filter-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {NOTE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterSport !== "all" || filterType !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterSport("all"); setFilterType("all"); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {notes.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span data-testid="notes-count">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
          {filteredNotes.length !== notes.length && <span>{filteredNotes.length} shown</span>}
          {pinnedNotes.length > 0 && <span>{pinnedNotes.length} pinned</span>}
        </div>
      )}

      {/* Empty state */}
      {notesQuery.isLoading && (
        <div className="text-center py-20 text-muted-foreground">Loading your notes…</div>
      )}

      {!notesQuery.isLoading && notes.length === 0 && (
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-12 text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-foreground/70 mb-1">Your research notebook is empty</p>
            <p className="text-sm text-muted-foreground mb-4">
              Save picks you want to analyze, jot down team notes, build parlay ideas — all in one place.
            </p>
            <Button onClick={openCreate} data-testid="button-first-note" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first note
            </Button>
          </CardContent>
        </Card>
      )}

      {!notesQuery.isLoading && notes.length > 0 && filteredNotes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No notes match your filters.{" "}
          <button className="text-primary underline" onClick={() => { setSearchQuery(""); setFilterSport("all"); setFilterType("all"); }}>
            Clear filters
          </button>
        </div>
      )}

      {/* Pinned notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Pin className="h-3.5 w-3.5 text-primary" />
            PINNED
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => openEdit(note)}
                onDelete={() => setDeleteNoteId(note.id)}
                onPin={() => pinMutation.mutate({ id: note.id, pinned: !note.pinned })}
                onTagClick={(tag) => setSearchQuery(tag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All other notes */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <div className="text-xs text-muted-foreground font-medium">ALL NOTES</div>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {unpinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => openEdit(note)}
                onDelete={() => setDeleteNoteId(note.id)}
                onPin={() => pinMutation.mutate({ id: note.id, pinned: !note.pinned })}
                onTagClick={(tag) => setSearchQuery(tag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={open => { if (!open) { setIsEditorOpen(false); setEditingNote(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-note-editor">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Research Note"}</DialogTitle>
            <DialogDescription>
              {editingNote ? "Update your note." : "Save picks, analysis, or ideas for your parlay research."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title</label>
              <Input
                placeholder="e.g. Lakers tonight — pace advantage?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                data-testid="input-note-title"
                className="bg-card/60"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Notes <span className="text-red-400">*</span></label>
              <Textarea
                placeholder="Your analysis, stats you found, reasons to back or fade, things to watch for…"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                data-testid="input-note-content"
                className="bg-card/60 resize-none"
              />
            </div>

            {/* Type & Sport row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Type</label>
                <Select value={form.note_type} onValueChange={v => setForm(f => ({ ...f, note_type: v }))}>
                  <SelectTrigger className="bg-card/60 border-border/50" data-testid="select-note-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sport</label>
                <Select value={form.sport || "none"} onValueChange={v => setForm(f => ({ ...f, sport: v === "none" ? "" : v }))}>
                  <SelectTrigger className="bg-card/60 border-border/50" data-testid="select-note-sport">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sport</SelectItem>
                    {SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference fields */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Reference (optional — link to a pick or game)</label>
              <Input
                placeholder="Game (e.g. Lakers @ Warriors, Mar 9)"
                value={form.related_game}
                onChange={e => setForm(f => ({ ...f, related_game: e.target.value }))}
                data-testid="input-note-game"
                className="bg-card/60 border-border/50 text-sm"
              />
              <Input
                placeholder="Pick (e.g. Lakers -4.5 spread)"
                value={form.related_pick}
                onChange={e => setForm(f => ({ ...f, related_pick: e.target.value }))}
                data-testid="input-note-pick"
                className="bg-card/60 border-border/50 text-sm"
              />
              <Input
                placeholder="Team (e.g. Los Angeles Lakers)"
                value={form.related_team}
                onChange={e => setForm(f => ({ ...f, related_team: e.target.value }))}
                data-testid="input-note-team"
                className="bg-card/60 border-border/50 text-sm"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
                <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <Input
                placeholder="e.g. back-to-back, injuries, sharp money, over"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                data-testid="input-note-tags"
                className="bg-card/60 border-border/50"
              />
            </div>

            {/* Pin toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  form.pinned
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-card/60 border-border/50 text-muted-foreground"
                }`}
                data-testid="button-toggle-pin"
              >
                {form.pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                {form.pinned ? "Pinned to top" : "Pin this note"}
              </button>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => { setIsEditorOpen(false); setEditingNote(null); setForm({ ...EMPTY_FORM }); }}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.content.trim()}
              data-testid="button-save-note"
            >
              {isSaving ? "Saving…" : editingNote ? "Save Changes" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single note confirmation */}
      <AlertDialog open={deleteNoteId !== null} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent data-testid="dialog-delete-note">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && deleteMutation.mutate(deleteNoteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All confirmation */}
      <AlertDialog open={showClearAll} onOpenChange={setShowClearAll}>
        <AlertDialogContent data-testid="dialog-clear-all">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all {notes.length} notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete every research note you've saved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Keep them</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-clear"
            >
              {clearAllMutation.isPending ? "Clearing…" : "Clear All Notes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Note Card Component ───────────────────────────────────────────────────────
function NoteCard({
  note, onEdit, onDelete, onPin, onTagClick
}: {
  note: ResearchNote;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onTagClick: (tag: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getNoteTypeInfo(note.note_type);
  const TypeIcon = typeInfo.icon;
  const isLong = note.content.length > 200;
  const displayContent = !expanded && isLong ? note.content.slice(0, 200) + "…" : note.content;

  return (
    <Card
      className={`border bg-card/60 transition-all hover:bg-card/80 flex flex-col ${
        note.pinned ? "border-primary/30 shadow-[0_0_12px_rgba(var(--primary)/0.08)]" : "border-border/50"
      }`}
      data-testid={`note-card-${note.id}`}
    >
      <CardHeader className="p-4 pb-2 flex-row items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <TypeIcon className={`h-3.5 w-3.5 shrink-0 ${typeInfo.color}`} />
            <span className={`text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
            {note.sport && (
              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${SPORT_COLORS[note.sport] || SPORT_COLORS["Other"]}`}>
                {note.sport}
              </Badge>
            )}
            {note.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
          </div>
          <h3 className="font-medium text-sm leading-tight line-clamp-1" data-testid={`note-title-${note.id}`}>
            {note.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mt-0.5">
          <button
            onClick={onPin}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title={note.pinned ? "Unpin" : "Pin"}
            data-testid={`button-pin-${note.id}`}
          >
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
            data-testid={`button-edit-${note.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete"
            data-testid={`button-delete-${note.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 space-y-2">
        {/* Reference context */}
        {(note.related_pick || note.related_game || note.related_team) && (
          <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 border border-border/30 space-y-0.5">
            {note.related_pick && (
              <div><span className="text-foreground/40">Pick: </span><span className="text-foreground/70">{note.related_pick}</span></div>
            )}
            {note.related_game && (
              <div><span className="text-foreground/40">Game: </span><span className="text-foreground/70">{note.related_game}</span></div>
            )}
            {note.related_team && (
              <div><span className="text-foreground/40">Team: </span><span className="text-foreground/70">{note.related_team}</span></div>
            )}
          </div>
        )}

        {/* Content */}
        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed" data-testid={`note-content-${note.id}`}>
          {displayContent}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary/80 hover:text-primary flex items-center gap-1"
            data-testid={`button-expand-${note.id}`}
          >
            {expanded ? "Show less" : "Show more"}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {note.tags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                data-testid={`tag-${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 pt-1 text-[10px] text-muted-foreground/60">
          <Calendar className="h-2.5 w-2.5" />
          <span>{formatRelativeTime(note.updated_at)}</span>
          {note.updated_at !== note.created_at && <span>• edited</span>}
        </div>
      </CardContent>
    </Card>
  );
}
