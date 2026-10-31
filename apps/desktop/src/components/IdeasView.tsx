import { useState, useEffect } from "react";
import { Idea } from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import {
  Search,
  Archive,
  Trash2,
  Tag,
  Plus,
  Check,
} from "lucide-react";
import { IdeaEmptyIllustration } from "./EmptyIllustrations";

export function IdeasView() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const loadIdeas = () => {
    setIdeas(Storage.getIdeas());
  };

  useEffect(() => {
    loadIdeas();
    const unsub = Storage.subscribe(loadIdeas);
    return () => {
      unsub();
    };
  }, []);

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const idea: Idea = {
      id: generateUUID(),
      title: newTitle.trim(),
      content: newContent.trim(),
      archived_at: null,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };

    Storage.saveIdea(idea);
    setNewTitle("");
    setNewContent("");
    setNewTags("");
    setIsExpanded(false);
    loadIdeas();
  };

  const handleToggleArchive = (idea: Idea) => {
    const updated: Idea = {
      ...idea,
      archived_at: idea.archived_at ? null : new Date().toISOString(),
    };
    Storage.saveIdea(updated);
    loadIdeas();
  };

  const handleDelete = (id: string) => {
    Storage.deleteIdea(id);
    loadIdeas();
  };

  const filteredIdeas = ideas.filter((idea) => {
    const isArchived = Boolean(idea.archived_at);
    if (tab === "active" && isArchived) return false;
    if (tab === "archived" && !isArchived) return false;

    if (
      searchQuery &&
      !idea.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !idea.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 gap-6 w-full max-w-none min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-textPrimary">
            Idea Inbox
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Capture thoughts, notes, and sparks instantly without friction.
          </p>
        </div>

        <div className="flex items-center p-1 bg-surface border border-border rounded-xl">
          <button
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              tab === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            Active ({ideas.filter((i) => !i.archived_at).length})
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              tab === "archived"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            Archive ({ideas.filter((i) => Boolean(i.archived_at)).length})
          </button>
        </div>
      </div>

      {/* Quick Capture Box */}
      {tab === "active" && (
        <form
          onSubmit={handleCapture}
          className="p-4 rounded-2xl border border-border bg-surface shadow-sm focus-within:ring-2 focus-within:ring-primary transition space-y-3"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Capture an idea or note..."
            className="w-full bg-transparent text-sm font-medium text-textPrimary placeholder:text-textMuted focus:outline-none"
          />

          {isExpanded && (
            <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-100">
              <textarea
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Expand on the idea (optional body)..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-1 focus:ring-primary transition resize-none"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Tag className="w-3.5 h-3.5 text-textMuted" />
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Tags (comma separated)..."
                    className="w-full bg-transparent text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="px-3 py-1.5 text-xs font-medium text-textSecondary hover:bg-surfaceHover rounded-lg transition"
                  >
                    Collapse
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Capture Idea</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Search Bar (hidden when there are no ideas in this tab) */}
      {ideas.some((i) => (tab === "archived" ? Boolean(i.archived_at) : !i.archived_at)) && (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-surface text-textPrimary shadow-sm">
        <Search className="w-4 h-4 text-textMuted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ideas by title or text..."
          className="w-full bg-transparent text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
        />
      </div>
      )}

      {/* Ideas Grid */}
      <div className={filteredIdeas.length === 0 ? "flex flex-1" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {filteredIdeas.length === 0 ? (
          <div className="flex-1 min-h-[320px] p-10 text-center border border-dashed border-border rounded-2xl bg-surface/30 flex flex-col items-center justify-center">
            <IdeaEmptyIllustration />
            <p className="text-sm font-semibold text-textPrimary">
              No ideas in {tab}
            </p>
            <p className="text-xs text-textMuted mt-1">
              Capture your thoughts using the quick capture bar above.
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className="p-5 rounded-2xl border border-border bg-surface hover:border-primary/50 transition group flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-textPrimary break-words">
                    {idea.title}
                  </h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => handleToggleArchive(idea)}
                      className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary transition"
                      title={idea.archived_at ? "Unarchive" : "Archive"}
                    >
                      {idea.archived_at ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="p-1.5 rounded-lg text-textMuted hover:bg-rose-500/10 hover:text-rose-600 transition"
                      title="Delete idea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {idea.content && (
                  <p className="text-xs text-textSecondary whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {idea.content}
                  </p>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between text-[11px] text-textMuted border-t border-border mt-3">
                <span className="font-mono">
                  {new Date(idea.created_at).toLocaleDateString()}
                </span>
                {idea.tags && idea.tags.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-surfaceHover text-textSecondary font-mono">
                    #{idea.tags.join(" #")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
