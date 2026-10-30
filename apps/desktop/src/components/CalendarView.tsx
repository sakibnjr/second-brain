import { useState, useEffect } from "react";
import { Task } from "@planner/contracts";
import { Storage } from "../lib/storage";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { TaskModal } from "./TaskModal";

export function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTasks = () => {
    setTasks(Storage.getTasks());
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleStatus = (task: Task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    Storage.saveTask({ ...task, status: nextStatus });
    loadTasks();
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const tasksOnSelectedDate = tasks.filter(
    (t) => t.due_at && t.due_at.startsWith(selectedDate)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-textPrimary">
            Schedule & Calendar
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Plan by date and review tasks scheduled on any day.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task for {selectedDate}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Picker Grid */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary">{monthName}</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-surfaceHover text-textSecondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-surfaceHover text-textSecondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-textMuted">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                day
              ).padStart(2, "0")}`;
              const isSelected = selectedDate === dateStr;
              const isToday =
                new Date().toISOString().split("T")[0] === dateStr;

              const taskCount = tasks.filter(
                (t) =>
                  t.status !== "completed" &&
                  t.due_at &&
                  t.due_at.startsWith(dateStr)
              ).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-9 rounded-lg flex flex-col items-center justify-center transition relative ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-sm"
                      : isToday
                      ? "border border-primary text-primary font-bold"
                      : "hover:bg-surfaceHover text-textPrimary"
                  }`}
                >
                  <span>{day}</span>
                  {taskCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-primary"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Tasks */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-textPrimary">
                Tasks for {selectedDate} ({tasksOnSelectedDate.length})
              </h3>
            </div>
          </div>

          {tasksOnSelectedDate.length === 0 ? (
            <div className="py-12 text-center text-xs text-textMuted border border-dashed border-border rounded-xl">
              No tasks scheduled for this date.
              <button
                onClick={() => setIsModalOpen(true)}
                className="block mx-auto mt-2 text-primary font-semibold hover:underline"
              >
                + Schedule a task
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasksOnSelectedDate.map((task) => {
                const isCompleted = task.status === "completed";
                return (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className="text-textMuted hover:text-primary transition"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium text-textPrimary ${
                            isCompleted ? "line-through text-textMuted" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-textSecondary mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surfaceHover text-textSecondary font-mono">
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => loadTasks()}
        defaultDate={selectedDate}
      />
    </div>
  );
}
