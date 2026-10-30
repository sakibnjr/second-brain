import { useState, useEffect } from "react";
import { Task, TaskStatus } from "@planner/contracts";
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
  LayoutList,
  Kanban,
  GripVertical,
} from "lucide-react";
import { TaskModal } from "./TaskModal";
import { TaskEmptyIllustration } from "./EmptyIllustrations";

type FilterTab = "all" | "today" | "upcoming" | "completed";
type ViewMode = "board" | "list";

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

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

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colStatus) {
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!id) return;

    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== targetStatus) {
      Storage.saveTask({ ...task, status: targetStatus });
      loadTasks();
    }
    setDraggedTaskId(null);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (
      searchQuery &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (priorityFilter !== "all" && t.priority !== priorityFilter) {
      return false;
    }

    if (viewMode === "list") {
      if (activeTab === "completed") return t.status === "completed";
      if (t.status === "completed") return false;
      if (activeTab === "today") return t.due_at && t.due_at.startsWith(todayStr);
      if (activeTab === "upcoming")
        return t.due_at && t.due_at.split("T")[0] > todayStr;
    }

    return true;
  });

  const columns: { id: TaskStatus; title: string; count: number; color: string }[] =
    [
      {
        id: "todo",
        title: "To Do",
        count: filteredTasks.filter((t) => t.status === "todo").length,
        color: "bg-slate-500",
      },
      {
        id: "in_progress",
        title: "In Progress",
        count: filteredTasks.filter((t) => t.status === "in_progress").length,
        color: "bg-blue-500",
      },
      {
        id: "completed",
        title: "Completed",
        count: filteredTasks.filter((t) => t.status === "completed").length,
        color: "bg-emerald-500",
      },
    ];

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher (Board vs List) */}
          <div className="flex items-center p-1 bg-background border border-border rounded-xl">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === "board"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          {/* List View Tabs */}
          {viewMode === "list" && (
            <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
              {(["all", "today", "upcoming", "completed"] as FilterTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      activeTab === tab
                        ? "bg-surface text-textPrimary shadow-sm border border-border"
                        : "text-textSecondary hover:text-textPrimary"
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>
          )}

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-textPrimary focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="flex-1 sm:w-64 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background text-textPrimary">
            <Search className="w-3.5 h-3.5 text-textMuted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-transparent text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Inline Quick Add */}
      <form onSubmit={handleQuickAdd} className="w-full">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="+ Quick add a task to board (Press Enter)..."
          className="w-full px-4 py-3 rounded-2xl border border-dashed border-border hover:border-primary/60 bg-surface/80 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary focus:bg-surface transition shadow-sm"
        />
      </form>

      {/* VIEW 1: DRAG & DROP KANBAN BOARD */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isDropActive = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border p-4 bg-surface/50 backdrop-blur transition min-h-[500px] ${
                  isDropActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-surface/70"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-bold text-textPrimary">
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-surfaceHover text-textSecondary border border-border">
                    {col.count}
                  </span>
                </div>

                {/* Draggable Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div
                      className={`h-32 border-2 border-dashed rounded-xl flex items-center justify-center text-xs text-textMuted transition ${
                        isDropActive
                          ? "border-primary text-primary font-semibold bg-primary/10"
                          : "border-border/60"
                      }`}
                    >
                      {isDropActive
                        ? "Drop task here"
                        : "Drag tasks here to change status"}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isOverdue =
                        task.status !== "completed" &&
                        task.due_at &&
                        task.due_at.split("T")[0] < todayStr;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 shadow-sm transition group cursor-grab active:cursor-grabbing hover:shadow-md space-y-2 select-none"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <GripVertical className="w-4 h-4 text-textMuted group-hover:text-primary transition shrink-0 mt-0.5" />
                              <h4
                                className={`text-xs font-semibold text-textPrimary break-words leading-snug ${
                                  task.status === "completed"
                                    ? "line-through text-textMuted"
                                    : ""
                                }`}
                              >
                                {task.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setIsModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textPrimary"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1 rounded hover:bg-rose-500/10 text-textMuted hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-textSecondary line-clamp-2 pl-6">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 pl-6 text-[10px] font-mono">
                            <span
                              className={`uppercase font-bold px-2 py-0.5 rounded ${
                                task.priority === "high"
                                  ? "bg-rose-500/10 text-rose-600"
                                  : task.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-emerald-500/10 text-emerald-600"
                              }`}
                            >
                              {task.priority}
                            </span>

                            {task.due_at && (
                              <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                  isOverdue
                                    ? "bg-rose-500/15 text-rose-600 font-bold"
                                    : "text-textSecondary"
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                <span>{task.due_at.split("T")[0]}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FULL-WIDTH LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-2.5 w-full">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface/30 flex flex-col items-center justify-center">
              <TaskEmptyIllustration />
              <p className="text-sm font-semibold text-textPrimary">
                No tasks found in {activeTab}
              </p>
              <p className="text-xs text-textMuted mt-1">
                Create a task above or switch views to organize.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isOverdue =
                !isCompleted &&
                task.due_at &&
                task.due_at.split("T")[0] < todayStr;

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

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg text-textMuted hover:bg-rose-500/10 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
