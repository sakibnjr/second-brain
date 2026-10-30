import { useState, useEffect } from "react";
import { Task } from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Tag,
} from "lucide-react";
import { TaskModal } from "./TaskModal";

type FilterTab = "today" | "upcoming" | "all" | "completed";

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = () => {
    setTasks(Storage.getTasks());
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const newTask: Task = {
      id: generateUUID(),
      title: quickInput.trim(),
      description: null,
      priority: "medium",
      status: "todo",
      due_at: activeTab === "today" ? new Date().toISOString() : null,
      reminder_at: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };

    Storage.saveTask(newTask);
    setQuickInput("");
    loadTasks();
  };

  const handleToggleStatus = (task: Task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    Storage.saveTask({ ...task, status: nextStatus });
    loadTasks();
  };

  const handleDelete = (id: string) => {
    Storage.deleteTask(id);
    loadTasks();
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    // Search
    if (
      searchQuery &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Priority
    if (priorityFilter !== "all" && t.priority !== priorityFilter) {
      return false;
    }

    // Tab
    if (activeTab === "completed") {
      return t.status === "completed";
    }
    if (t.status === "completed") {
      return false;
    }
    if (activeTab === "today") {
      return t.due_at && t.due_at.startsWith(todayStr);
    }
    if (activeTab === "upcoming") {
      return t.due_at && t.due_at.split("T")[0] > todayStr;
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-xl">
          {(["all", "today", "upcoming", "completed"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Search and Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-surface text-textPrimary shadow-sm">
          <Search className="w-4 h-4 text-textMuted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title or notes..."
            className="w-full bg-transparent text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-textPrimary focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Inline Quick Add */}
      <form onSubmit={handleQuickAdd} className="relative">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder={`+ Quick add task to ${activeTab} (Press Enter)...`}
          className="w-full px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/60 bg-surface/60 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary focus:bg-surface transition shadow-sm"
        />
      </form>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/30">
            <CheckCircle2 className="w-8 h-8 text-textMuted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-textSecondary">
              No tasks found in {activeTab}.
            </p>
            <p className="text-xs text-textMuted mt-1">
              Use the bar above or click "New Task" to create one.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isOverdue =
              !isCompleted && task.due_at && task.due_at.split("T")[0] < todayStr;

            return (
              <div
                key={task.id}
                className={`flex items-start justify-between p-4 rounded-xl border bg-surface transition group hover:shadow-sm ${
                  isOverdue
                    ? "border-rose-500/40 bg-rose-500/5"
                    : isCompleted
                    ? "border-border/60 opacity-60"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 text-textMuted hover:text-primary transition shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium text-textPrimary break-words ${
                        isCompleted ? "line-through text-textMuted" : ""
                      }`}
                    >
                      {task.title}
                    </p>

                    {task.description && (
                      <p className="text-xs text-textSecondary line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-textMuted font-mono">
                      {task.due_at && (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                            isOverdue
                              ? "bg-rose-500/10 text-rose-600 font-semibold"
                              : "bg-surfaceHover text-textSecondary"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{task.due_at.split("T")[0]}</span>
                        </span>
                      )}

                      <span
                        className={`capitalize font-semibold px-2 py-0.5 rounded text-[10px] ${
                          task.priority === "high"
                            ? "bg-rose-500/10 text-rose-600"
                            : task.priority === "medium"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-emerald-500/10 text-emerald-600"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-textMuted" />
                          <span>{task.tags.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      setEditingTask(task);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary transition"
                    title="Edit task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 rounded-lg text-textMuted hover:bg-rose-500/10 hover:text-rose-600 transition"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={() => loadTasks()}
        initialTask={editingTask}
      />
    </div>
  );
}
