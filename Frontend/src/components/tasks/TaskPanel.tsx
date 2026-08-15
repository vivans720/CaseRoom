import React, { useEffect, useState, useMemo } from "react";
import { Plus, CheckSquare, Search, Loader2, X, Sparkles } from "lucide-react";
import type { Task, TaskStatus, User, CreateTaskDto } from "../../types";
import { getCaseTasks, createTask, updateTask, deleteTask } from "../../services/taskService";
import { getCaseParticipants } from "../../services/caseService";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { TaskItem } from "./TaskItem";
import { CreateTaskModal } from "./CreateTaskModal";
import { AITaskExtractorModal } from "./AITaskExtractorModal";

interface TaskPanelProps {
  caseId: string;
  participants?: User[];
  currentUserId?: string;
  socket?: any;
  onClose?: () => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  caseId,
  participants: propsParticipants,
  currentUserId: propsCurrentUserId,
  socket: propsSocket,
  onClose,
}) => {
  const { user } = useAuth();
  const { socket: contextSocket } = useSocket();

  const currentUserId = propsCurrentUserId || user?._id;
  const socket = propsSocket || contextSocket;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [participants, setParticipants] = useState<User[]>(propsParticipants || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "assigned" | "todo" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAIExtractOpen, setIsAIExtractOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, fetchedParticipants] = await Promise.all([
        getCaseTasks(caseId),
        propsParticipants && propsParticipants.length > 0
          ? Promise.resolve(propsParticipants)
          : getCaseParticipants(caseId),
      ]);

      if (tasksRes.success && Array.isArray(tasksRes.data)) {
        setTasks(tasksRes.data);
      }
      if (Array.isArray(fetchedParticipants)) {
        setParticipants(fetchedParticipants);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load task panel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchData();
    }
  }, [caseId]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (data: { caseId: string; task: Task }) => {
      if (data.caseId === caseId) {
        setTasks((prev) => [data.task, ...prev.filter((t) => t._id !== data.task._id)]);
      }
    };

    const handleTaskUpdated = (data: { caseId: string; task: Task }) => {
      if (data.caseId === caseId) {
        setTasks((prev) =>
          prev.map((t) => (t._id === data.task._id ? data.task : t))
        );
      }
    };

    const handleTaskDeleted = (data: { caseId: string; taskId: string }) => {
      if (data.caseId === caseId) {
        setTasks((prev) => prev.filter((t) => t._id !== data.taskId));
      }
    };

    socket.on("task_created", handleTaskCreated);
    socket.on("task_updated", handleTaskUpdated);
    socket.on("task_deleted", handleTaskDeleted);

    return () => {
      socket.off("task_created", handleTaskCreated);
      socket.off("task_updated", handleTaskUpdated);
      socket.off("task_deleted", handleTaskDeleted);
    };
  }, [socket, caseId]);

  const handleToggleStatus = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === "done" ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      const res = await updateTask(caseId, taskId, { status: newStatus });
      if (res.success && res.data) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? res.data : t))
        );
      }
    } catch (err) {
      fetchData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await deleteTask(caseId, taskId);
    } catch (err) {
      fetchData();
    }
  };

  const handleCreateTask = async (taskData: CreateTaskDto) => {
    const res = await createTask(caseId, taskData);
    if (res.success && res.data) {
      setTasks((prev) => {
        const exists = prev.some((t) => t._id === res.data._id);
        if (exists) {
          return prev.map((t) => (t._id === res.data._id ? res.data : t));
        }
        return [res.data, ...prev];
      });
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        searchQuery &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (filter === "assigned") {
        return t.assignees.some((a) => a._id === currentUserId);
      }
      if (filter === "todo") {
        return t.status !== "done";
      }
      if (filter === "done") {
        return t.status === "done";
      }

      return true;
    });
  }, [tasks, filter, searchQuery, currentUserId]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progressPct };
  }, [tasks]);

  return (
    <div className="w-full md:w-[320px] flex flex-col h-full bg-white/95 backdrop-blur-xl border-l border-slate-200 text-slate-900 shrink-0 shadow-lg overflow-hidden max-w-full">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
        {/* Top Header Row: Title on Left, Close Button on Right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-[#5B4CF3] shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-900 truncate">Action Items</h3>
            <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-[#5B4CF3] border border-indigo-100 rounded-full shrink-0">
              {stats.total}
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none cursor-pointer shrink-0"
              aria-label="Close task panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action CTAs Row - Equal width side-by-side buttons */}
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={() => setIsAIExtractOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all duration-200 focus:outline-none cursor-pointer truncate"
            title="Extract action items from chat using AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5B4CF3] shrink-0" />
            <span className="truncate">AI Extract</span>
          </button>
          
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            title="Create Task"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#5B4CF3] hover:bg-[#4c3ed8] text-white text-xs font-bold rounded-xl shadow-xs transition-all duration-200 active:scale-95 focus:outline-none cursor-pointer truncate"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">New Task</span>
          </button>
        </div>

        {/* Integrated Progress Card */}
        {stats.total > 0 && (
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Task Completion</span>
              <span className="text-[#5B4CF3] font-mono">{stats.completed}/{stats.total} ({stats.progressPct}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5B4CF3] to-purple-600 transition-all duration-300 rounded-full"
                style={{ width: `${stats.progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#5B4CF3] focus:ring-2 focus:ring-[#5B4CF3]/10 transition-all"
              />
            </div>

            <select
              value={filter}
              onChange={(e: any) => setFilter(e.target.value)}
              className="w-20 shrink-0 px-2 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#5B4CF3] focus:ring-2 focus:ring-[#5B4CF3]/10 transition-all cursor-pointer"
            >
              <option value="all">All</option>
              <option value="assigned">Mine</option>
              <option value="todo">To Do</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Active Filter Removable Chip */}
          {(filter !== "all" || searchQuery.trim() !== "") && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold truncate max-w-[200px]">
                <span className="truncate">{searchQuery ? `"${searchQuery}"` : filter === "assigned" ? "Mine" : filter === "todo" ? "To Do" : "Done"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearchQuery("");
                  }}
                  className="p-0.5 hover:bg-indigo-100 rounded-xs text-indigo-600 cursor-pointer shrink-0"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#5B4CF3]" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-xs text-red-500 font-medium mb-2">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="text-xs font-bold text-[#5B4CF3] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No action items found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchQuery || filter !== "all"
                ? "Try clearing your filters"
                : "Create tasks to assign action items to team members"}
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <TaskItem
              key={t._id}
              task={t}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteTask}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateTask}
        participants={participants}
      />

      {/* AI Task Extractor Modal */}
      <AITaskExtractorModal
        caseId={caseId}
        isOpen={isAIExtractOpen}
        onClose={() => setIsAIExtractOpen(false)}
        onTasksCreated={fetchData}
      />
    </div>
  );
};
