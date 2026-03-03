import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Bug, Lightbulb, Star, Zap, Plus, Trash2, CheckCircle2,
  Clock, PlayCircle, Copy, ClipboardList, Filter, RefreshCw,
  ArrowUp, ArrowRight, ArrowDown, MessageSquarePlus,
} from "lucide-react";

type ItemType = "bug" | "feature" | "enhancement" | "idea";
type Priority = "high" | "medium" | "low";
type Status = "pending" | "in-progress" | "done";

interface UpdateItem {
  id: string;
  title: string;
  type: ItemType;
  priority: Priority;
  status: Status;
  description: string;
  createdAt: string;
}

const STORAGE_KEY = "sors_update_planner_items";

const TYPE_CONFIG: Record<ItemType, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug Fix", icon: Bug, color: "text-red-500 bg-red-500/10 border-red-500/30" },
  feature: { label: "New Feature", icon: Star, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  enhancement: { label: "Enhancement", icon: Zap, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  idea: { label: "Idea", icon: Lightbulb, color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: any; color: string }> = {
  high: { label: "High", icon: ArrowUp, color: "text-red-500" },
  medium: { label: "Medium", icon: ArrowRight, color: "text-amber-500" },
  low: { label: "Low", icon: ArrowDown, color: "text-muted-foreground" },
};

const STATUS_CONFIG: Record<Status, { label: string; icon: any; color: string; next: Status }> = {
  pending: { label: "Pending", icon: Clock, color: "text-muted-foreground bg-muted border-border", next: "in-progress" },
  "in-progress": { label: "In Progress", icon: PlayCircle, color: "text-blue-500 bg-blue-500/10 border-blue-500/30", next: "done" },
  done: { label: "Done", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", next: "pending" },
};

function loadItems(): UpdateItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: UpdateItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export default function AdminUpdatePlanner() {
  const { toast } = useToast();
  const [items, setItems] = useState<UpdateItem[]>(loadItems);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    type: "feature" as ItemType,
    priority: "medium" as Priority,
    description: "",
  });

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter(i => filterType === "all" || i.type === filterType)
      .filter(i => filterStatus === "all" || i.status === filterStatus)
      .filter(i => filterPriority === "all" || i.priority === filterPriority)
      .sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        const sOrder = { pending: 0, "in-progress": 1, done: 2 };
        if (a.status !== b.status) return sOrder[a.status] - sOrder[b.status];
        return pOrder[a.priority] - pOrder[b.priority];
      });
  }, [items, filterType, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    pending: items.filter(i => i.status === "pending").length,
    inProgress: items.filter(i => i.status === "in-progress").length,
    done: items.filter(i => i.status === "done").length,
    bugs: items.filter(i => i.type === "bug" && i.status !== "done").length,
  }), [items]);

  function handleAdd() {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const newItem: UpdateItem = {
      id: `item-${Date.now()}`,
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setForm({ title: "", type: "feature", priority: "medium", description: "" });
    toast({ title: "Added", description: `"${newItem.title}" added to your planner.` });
  }

  function cycleStatus(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: STATUS_CONFIG[i.status].next } : i));
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function copyPrompt() {
    const pending = items.filter(i => i.status !== "done");
    if (pending.length === 0) {
      toast({ title: "Nothing to copy", description: "All items are marked done." });
      return;
    }
    const lines = [
      "Here are my current update requests for Sors Maxima:",
      "",
      ...pending.map((item, idx) => [
        `${idx + 1}. [${item.type.toUpperCase()}] ${item.title}`,
        `   Priority: ${item.priority}`,
        item.description ? `   Details: ${item.description}` : null,
        `   Status: ${item.status}`,
      ].filter(Boolean).join("\n")),
      "",
      "Please work through these in order of priority.",
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied!", description: "Paste this into the chat to request updates." });
  }

  function clearDone() {
    setItems(prev => prev.filter(i => i.status !== "done"));
    toast({ title: "Cleared", description: "All done items removed." });
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Update Planner
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track bugs, features, and ideas. Copy your list and paste it into the AI chat to request updates.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearDone} disabled={stats.done === 0} data-testid="button-clear-done">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Clear Done ({stats.done})
            </Button>
            <Button size="sm" onClick={copyPrompt} data-testid="button-copy-prompt">
              <Copy className="w-4 h-4 mr-1.5" /> Copy Update Request
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending", value: stats.pending, color: "text-muted-foreground", bg: "bg-muted/30" },
            { label: "In Progress", value: stats.inProgress, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Done", value: stats.done, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Open Bugs", value: stats.bugs, color: "text-red-500", bg: "bg-red-500/10" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.bg}`}>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                Add New Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Describe the bug or feature..."
                  className="h-8 text-sm"
                  data-testid="input-item-title"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ItemType }))}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug Fix</SelectItem>
                      <SelectItem value="feature">New Feature</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                      <SelectItem value="idea">Idea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-item-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Details (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any extra context or steps to reproduce..."
                  className="text-sm resize-none"
                  rows={3}
                  data-testid="textarea-item-description"
                />
              </div>

              <Button className="w-full" size="sm" onClick={handleAdd} data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-1.5" /> Add to Planner
              </Button>

              <div className="rounded-md bg-muted/40 border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">How to request updates:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Add your bugs and features here</li>
                  <li>Click <span className="font-medium text-foreground">"Copy Update Request"</span></li>
                  <li>Paste into the AI chat</li>
                  <li>The AI will build your updates</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 w-32 text-xs" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-7 w-32 text-xs" data-testid="select-filter-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug Fix</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="enhancement">Enhancement</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-7 w-28 text-xs" data-testid="select-filter-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">{items.length === 0 ? "No items yet" : "No items match your filters"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {items.length === 0 ? "Add bugs, feature requests, and ideas using the form." : "Try adjusting your filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map(item => {
                  const typeConf = TYPE_CONFIG[item.type];
                  const priorityConf = PRIORITY_CONFIG[item.priority];
                  const statusConf = STATUS_CONFIG[item.status];
                  const TypeIcon = typeConf.icon;
                  const PriorityIcon = priorityConf.icon;
                  const StatusIcon = statusConf.icon;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 space-y-2 transition-opacity ${item.status === "done" ? "opacity-50" : ""}`}
                      data-testid={`item-card-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <TypeIcon className={`w-4 h-4 shrink-0 ${typeConf.color.split(" ")[0]}`} />
                          <p className={`text-sm font-medium truncate ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => cycleStatus(item.id)}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors ${statusConf.color}`}
                            title="Click to advance status"
                            data-testid={`button-status-${item.id}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${typeConf.color}`}>
                          {typeConf.label}
                        </Badge>
                        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${priorityConf.color}`}>
                          <PriorityIcon className="w-3 h-3" />
                          {priorityConf.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(item.createdAt)}</span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
