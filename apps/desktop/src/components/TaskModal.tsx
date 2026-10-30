import { useState, useEffect } from "react";
import { Task, TaskPriority, TaskStatus } from "@planner/contracts";
import { X, Calendar, Flag } from "lucide-react";
import { Storage, generateUUID } from "../lib/storage";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
  defaultDate?: string;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultDate,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || "");
      setPriority(initialTask.priority);
      setStatus(initialTask.status);
      setDueDate(
        initialTask.due_at
          ? new Date(initialTask.due_at).toISOString().split("T")[0]
          : ""
      );
      setTagsInput(initialTask.tags ? initialTask.tags.join(", ") : "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setDueDate(defaultDate || "");
      setTagsInput("");
    }
  }, [initialTask, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const task: Task = {
      id: initialTask?.id || generateUUID(),
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_at: dueDate ? new Date(dueDate).toISOString() : null,
      reminder_at: null,
      tags,
      created_at: initialTask?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: initialTask?.version || 1,
    };

    Storage.saveTask(task);
    onSave(task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="text-lg font-semibold text-textPrimary">
            {initialTask ? "Edit Task" : "Create New Task"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Supabase integration"
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add extra context or instructions..."
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-500" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. dev, study, work"
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-textSecondary hover:bg-surfaceHover rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition"
            >
              {initialTask ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
