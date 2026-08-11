import { useState, useEffect, type JSX } from "react";
import { Sparkles } from "lucide-react";
import { searchCases } from "../../services/caseService";
import aiService from "../../services/aiService";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { CaseListItem } from "./CaseListItem";
import { useCases } from "../../hooks/useCases";
import type { Case, CasePriority, CaseCategory, CaseStatus } from "../../types";

export const CaseSearchPanel = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const [useAISearch, setUseAISearch] = useState(false);
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [priority, setPriority] = useState<CasePriority | "">("");
  const [category, setCategory] = useState<CaseCategory | "">("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "recently_active">(
    "newest",
  );
  const [results, setResults] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { unreadCounts, pinCase, unpinCase } = useCases();

  const parseStatus = (value: string): CaseStatus | "" => {
    const valid: CaseStatus[] = [
      "Open",
      "In Progress",
      "Under Review",
      "Resolved",
      "Closed",
      "active",
      "archived",
    ];
    if (valid.includes(value as CaseStatus)) return value as CaseStatus;
    return "";
  };

  const parseSortBy = (
    value: string,
  ): "newest" | "oldest" | "recently_active" => {
    if (value === "oldest" || value === "recently_active") return value;
    return "newest";
  };

  useEffect(() => {
    if (!query.trim() && !status && !priority && !category) {
      setResults([]);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (useAISearch && query.trim()) {
          const aiResults = await aiService.searchCases(query.trim());
          setResults(aiResults);
        } else {
          const data = await searchCases({
            q: query || undefined,
            status: status || undefined,
            priority: priority || undefined,
            category: category || undefined,
            sortBy,
          });
          setResults(data);
        }
      } catch {
        setError("Failed to search cases.");
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timerId);
  }, [query, useAISearch, status, priority, category, sortBy]);

  return (
    <aside className="w-[320px] bg-white border-l border-border flex flex-col shrink-0 h-full overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Global Case Search
          </h3>
          <button
            type="button"
            onClick={() => setUseAISearch(!useAISearch)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              useAISearch
                ? "bg-[#5B4CF3] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
            title="Semantic Search (matches intent & context)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Search</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xs">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full pl-9 pr-4 py-2 bg-surface-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(parseStatus(e.target.value))}
              className="flex-1 bg-surface-tertiary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(parseSortBy(e.target.value))}
              className="flex-1 bg-surface-tertiary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="recently_active">Recent</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CasePriority | "")}
              className="flex-1 bg-surface-tertiary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory | "")}
              className="flex-1 bg-surface-tertiary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Incident">Incident</option>
              <option value="Legal">Legal</option>
              <option value="HR">HR</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && error && (
          <p className="p-6 text-center text-sm text-danger">{error}</p>
        )}

        {!isLoading &&
          !error &&
          (query.trim() || status) &&
          results.length === 0 && (
            <EmptyState
              title="No cases found"
              description="Adjust your search or filters."
            />
          )}

        {!isLoading && !error && !query.trim() && !status && (
          <div className="p-6 text-center">
            <p className="text-sm text-text-tertiary">
              Enter a title or choose a status to find cases.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="py-2">
            {results.map((c) => (
              <CaseListItem
                key={c._id}
                caseData={c}
                unreadCount={unreadCounts[c._id] ?? 0}
                onPin={() => pinCase(c._id)}
                onUnpin={() => unpinCase(c._id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
