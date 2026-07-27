import React, { useState } from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import type { CreateTaskDto, TaskPriority, User } from "../../types";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (taskData: CreateTaskDto) => Promise<void>;
  participants: User[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  participants,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assignees: selectedAssignees,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setSelectedAssignees([]);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Action Item" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-900">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gather forensic report"
            className="w-full h-[48px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-900">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add extra details or instructions..."
            rows={3}
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 resize-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-900">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-900">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
            />
          </div>
        </div>

        {/* Assignees */}
        {participants.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#5B4CF3]" />
              <span>Assign Participants</span>
            </label>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/70 p-2 space-y-1">
              {participants.map((p) => {
                const isSelected = selectedAssignees.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggleAssignee(p._id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-purple-50 text-[#5B4CF3] border border-purple-200/60"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded accent-[#5B4CF3]"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-5 py-2.5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(91,76,243,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,76,243,0.5)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? <Spinner size="sm" /> : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
