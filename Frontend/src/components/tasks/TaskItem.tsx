import React from "react";
import { CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import type { Task, TaskStatus } from "../../types";
import { Avatar } from "../ui/Avatar";

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

  // Standard Priority Palette - Solid Pastel Pills
  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-rose-100 text-rose-800 border-rose-200/80 font-bold";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200/80 font-bold";
      case "medium":
        return "bg-sky-100 text-sky-800 border-sky-200/80 font-semibold";
      case "low":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200/80 font-medium";
    }
  };

  const now = new Date().getTime();
  const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const isOverdue = dueTime !== null && !isDone && dueTime < now;
  const isDueSoon = dueTime !== null && !isDone && !isOverdue && dueTime - now < 24 * 60 * 60 * 1000;

  const canDelete =
    currentUserId &&
    (task.createdBy?._id === currentUserId ||
      task.assignees.some((a) => a._id === currentUserId));

  // Overlap avatar logic (>2 assignees)
  const visibleAssignees = task.assignees.slice(0, 2);
  const extraAssigneesCount = task.assignees.length - 2;

  return (
    <div
      className={`group relative flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 w-full max-w-full overflow-hidden ${
        isDone
          ? "bg-slate-50/80 border-slate-200/60 opacity-50 grayscale-[25%] shadow-none"
          : "bg-white border-slate-200/80 shadow-2xs hover:border-indigo-200 hover:shadow-xs"
      }`}
    >
      {/* Checkbox Button */}
      <button
        type="button"
        onClick={() =>
          onToggleStatus(task._id, isDone ? "todo" : "done")
        }
        className="mt-0.5 text-slate-400 hover:text-[#5B4CF3] transition-colors focus:outline-none shrink-0 cursor-pointer"
        title={isDone ? "Mark as incomplete" : "Mark as completed"}
      >
        {isDone ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-100" />
        ) : (
          <Circle className="w-4.5 h-4.5 text-slate-400 hover:text-indigo-600 transition-colors" />
        )}
      </button>

      {/* Main Content Grid */}
      <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
        {/* Row 1: Title + Priority Badge */}
        <div className="flex items-start justify-between gap-1.5 w-full">
          <h4
            className={`font-bold text-xs leading-tight break-words flex-1 min-w-0 ${
              isDone ? "line-through text-slate-400" : "text-slate-900"
            }`}
          >
            {task.title}
          </h4>

          <span
            className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-md border shrink-0 ${getPriorityStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        </div>

        {/* Row 2: Description */}
        {task.description && (
          <p
            className={`text-xs leading-relaxed line-clamp-2 ${
              isDone ? "line-through text-slate-400" : "text-slate-600 font-normal"
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Row 3 (Bottom Footer): Due Date + Assignees + Trash Icon */}
        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px] font-semibold w-full">
          {/* Left Footer Group: Due Date Badge + Assignees */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {/* Neutral Outline Due Date Badge */}
            {task.dueDate && (
              <div
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] shrink-0 ${
                  isOverdue
                    ? "border-rose-400 text-rose-700 bg-white font-bold"
                    : isDueSoon
                    ? "border-amber-400 text-amber-800 bg-white font-bold"
                    : "border-slate-200 text-slate-600 bg-white font-medium"
                }`}
                title={isOverdue ? "Overdue task!" : isDueSoon ? "Due within 24 hours" : "Due date"}
              >
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            )}

            {/* Overlapping Assignee Avatars with +N counter */}
            {task.assignees.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400 font-medium text-[10px]">Assigned:</span>
                <div className="flex items-center -space-x-1.5">
                  {visibleAssignees.map((a) => (
                    <div key={a._id} title={a.name} className="ring-2 ring-white rounded-full shrink-0">
                      <Avatar name={a.name} src={a.profilePictureUrl} size="xs" />
                    </div>
                  ))}
                  {extraAssigneesCount > 0 && (
                    <div
                      className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0 shadow-2xs"
                      title={task.assignees.slice(2).map((a) => a.name).join(", ")}
                    >
                      +{extraAssigneesCount}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right-Aligned Delete Action Button */}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(task._id)}
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors focus:outline-none cursor-pointer shrink-0 ml-auto"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isDone && task.completedBy && (
          <p className="text-[10px] text-emerald-600 font-semibold pt-0.5">
            Done by {task.completedBy.name.split(" ")[0]}
          </p>
        )}
      </div>
    </div>
  );
};
