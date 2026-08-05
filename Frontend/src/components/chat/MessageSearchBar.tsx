import { useState, useEffect, type JSX } from "react";
import { searchMessages } from "../../services/messageService";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import type { Message } from "../../types";

interface MessageSearchBarProps {
  caseId: string;
  onClose: () => void;
  onResultClick: (messageId: string) => void;
}

export const MessageSearchBar = ({
  caseId,
  onClose,
  onResultClick,
}: MessageSearchBarProps): JSX.Element => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await searchMessages(caseId, query);
        setResults(data);
      } catch {
        setError("Failed to search messages.");
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timerId);
  }, [query, caseId]);

  return (
    <aside
      id="message-search-panel"
      className="w-full md:w-[300px] bg-white/90 backdrop-blur-xl border-l border-slate-200/80 flex flex-col shrink-0 h-full overflow-hidden shadow-xl md:shadow-none"
      aria-label="Search panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Search Messages</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Close search"
          aria-label="Close search"
        >
          ✕
        </button>
      </div>

      {/* Search Input Area */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#5B4CF3] transition-colors text-xs">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words, phrases..."
            autoFocus
            className="w-full h-[46px] pl-9 pr-8 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs font-normal text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200/70 w-4.5 h-4.5 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-300 transition-colors"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner size="md" />
            <p className="text-xs text-text-tertiary animate-pulse">Searching messages...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {!isLoading && !error && query.trim() && results.length === 0 && (
          <div className="px-4 py-12">
            <EmptyState
              title="No matches found"
              description={`We couldn't find any messages matching "${query}" in this case.`}
            />
          </div>
        )}

        {!isLoading && !error && !query.trim() && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-surface-tertiary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-text-tertiary">
              🔎
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              Find what you're looking for
            </p>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Search through all messages and files within this case.
            </p>
          </div>
        )}

        {results.length > 0 && !isLoading && (
          <div className="divide-y divide-border-light">
            <div className="px-4 py-2 bg-surface-secondary/50">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? "s" : ""} found
              </span>
            </div>
            {results.map((msg) => (
              <button
                key={msg._id}
                onClick={() => onResultClick(msg._id)}
                className="w-full text-left px-4 py-4 hover:bg-primary-lighter transition-colors group"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-bold text-primary truncate max-w-[160px]">
                    {typeof msg.senderId === "string" ? "User" : msg.senderId.name}
                  </span>
                  <span className="text-[10px] text-text-tertiary shrink-0 font-medium">
                    {new Date(msg.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="relative">
                   <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed group-hover:text-text-primary transition-colors">
                    {msg.content || (msg.fileUrl ? `📎 ${msg.fileName || "File Attachment"}` : "")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
