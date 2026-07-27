import { useState, useEffect, type JSX } from "react";
import { fetchAllCases } from "../../services/caseService";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { CaseListItem } from "./CaseListItem";
import { useCases } from "../../hooks/useCases";
import type { Case } from "../../types";

export const AllCasesPanel = (): JSX.Element => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCounts, pinCase, unpinCase } = useCases();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllCases();
      setCases(data);
    } catch {
      setError("Failed to fetch all cases.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <aside className="w-[320px] bg-white border-l border-border flex flex-col shrink-0 h-full overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">All System Cases</h3>
        <button 
          onClick={loadData} 
          className="text-xs text-primary hover:underline"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && error && (
          <div className="p-6 text-center">
            <p className="text-sm text-danger mb-3">{error}</p>
            <button
              onClick={loadData}
              className="text-xs font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && cases.length === 0 && (
          <EmptyState
            title="No cases found"
            description="There are no cases in the system yet."
          />
        )}

        {!isLoading && !error && cases.length > 0 && (
          <div className="py-2">
            {cases.map((c) => (
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
