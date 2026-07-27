import React from "react";
import { CheckCircle2, Circle, Clock, Trash2, AlertCircle } from "lucide-react";
import type { Task, TaskStatus } from "../../types";

interface TaskItemProps {
  task: Task;
  onToggleStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  currentUserId?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleStatus,
  onDelete,
  currentUserId,
}) => {
  const isDone = task.status === "done";

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-50 text-red-600 border-red-200/60 font-bold";
      case "high":
        return "bg-amber-50 text-amber-600 border-amber-200/60 font-semibold";
      case "medium":
        return "bg-purple-50 text-[#5B4CF3] border-purple-200/60 font-semibold";
      case "low":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200/60 font-medium";
    }
  };

  const isOverdue =
    task.dueDate &&
    !isDone &&
    new Date(task.dueDate).getTime() < new Date().getTime();

  const canDelete =
    currentUserId &&
    (task.createdBy._id === currentUserId ||
      task.assignees.some((a) => a._id === currentUserId));

  return (
    <div
      className={`group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-200 ${
        isDone
          ? "bg-slate-50/60 border-slate-200/60 opacity-75"
          : "bg-white/90 border-slate-200/80 shadow-2xs hover:border-purple-200 hover:shadow-xs"
      }`}
    >
      <button
        type="button"
        onClick={() =>
          onToggleStatus(task._id, isDone ? "todo" : "done")
        }
        className="mt-0.5 text-slate-400 hover:text-[#5B4CF3] transition-colors focus:outline-none shrink-0"
        title={isDone ? "Mark as incomplete" : "Mark as completed"}
      >
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
        ) : (
          <Circle className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h4
            className={`font-bold text-xs text-slate-900 leading-tight ${
              isDone ? "line-through text-slate-400" : ""
            }`}
          >
            {task.title}
          </h4>

          <span
            className={`px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-md border ${getPriorityStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p
            className={`text-xs text-slate-500 mb-2 line-clamp-2 font-medium ${
              isDone ? "line-through opacity-60" : ""
            }`}
          >
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold flex-wrap">
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue ? "text-red-500 font-bold" : "text-slate-500"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}

          {task.assignees.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Assigned:</span>
              <div className="flex -space-x-1">
                {task.assignees.map((a) => (
                  <div
                    key={a._id}
                    className="w-4.5 h-4.5 rounded-full bg-[#5B4CF3] text-white flex items-center justify-center text-[9px] font-bold border border-white"
                    title={a.name}
                  >
                    {a.name ? a.name[0].toUpperCase() : "U"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isDone && task.completedBy && (
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">
            Done by {task.completedBy.name.split(" ")[0]}
          </p>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(task._id)}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-lg transition-all focus:outline-none"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
