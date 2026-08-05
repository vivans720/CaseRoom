import { useEffect, useState, type JSX } from "react";
import { getMeetingHistory, type MeetingHistoryItem } from "../../services/meetingService";
import { Avatar } from "../ui/Avatar";

interface MeetingHistoryPanelProps {
  caseId: string;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDurationStr = (startStr: string, endStr?: string): string => {
  if (!endStr) return "In progress";
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = Math.max(0, end - start);
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const MeetingHistoryPanel = ({ caseId }: MeetingHistoryPanelProps): JSX.Element => {
  const [history, setHistory] = useState<MeetingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    setIsLoading(true);
    getMeetingHistory(caseId)
      .then((data) => {
        setHistory(data);
      })
      .catch((err) => {
        console.error("Failed to load meeting history:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-text-tertiary">
        Loading meeting history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-text-tertiary gap-2">
        <span className="text-2xl">📹</span>
        <span className="text-xs font-medium">No past meetings recorded for this case yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary px-1">
        Past Video Meetings ({history.length})
      </h3>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item._id}
            className="p-3 rounded-xl bg-surface-secondary border border-border/60 hover:border-primary/30 transition-colors flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                  📹
                </div>
                <span className="text-xs font-bold text-text-primary">
                  Meeting by {item.startedBy.name}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-text-tertiary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {getDurationStr(item.startedAt, item.endedAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-secondary border-t border-border/40 pt-2 mt-0.5">
              <span>{formatDate(item.startedAt)}</span>
              <div className="flex items-center gap-1">
                <span>{item.participants.length} attended</span>
                <div className="flex -space-x-1 ml-1">
                  {item.participants.slice(0, 3).map((p, idx) => (
                    <Avatar
                      key={idx}
                      name={p.user?.name || "User"}
                      src={p.user?.profilePictureUrl}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
