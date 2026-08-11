import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type JSX,
  type ReactNode,
  type ChangeEvent,
} from "react";
import type { User, CaseRole } from "../../types";
import { searchUsers } from "../../services/userService";
import { updateParticipants } from "../../services/caseService";
import aiService, { type ParticipantRecommendation } from "../../services/aiService";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { Sparkles } from "lucide-react";

const DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 1;

interface AddParticipantModalProps {
  caseId: string;
  existingParticipantIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const renderHighlightedText = (text: string, query: string): ReactNode => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-purple-100 text-[#5B4CF3] font-bold rounded-xs px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// ─── Result row ──────────────────────────────────────────────────────────────

interface UserResultRowProps {
  user: User;
  query: string;
  isAdding: boolean;
  onAdd: (userId: string) => void;
}

const UserResultRow = ({
  user,
  query,
  isAdding,
  onAdd,
}: UserResultRowProps): JSX.Element => (
  <li className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200/60">
    <Avatar name={user.name} size="sm" src={user.profilePictureUrl} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-slate-900 truncate">
          {renderHighlightedText(user.name, query)}
        </p>
        {user.roleName && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
            {user.roleName}
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-500 truncate">
        {renderHighlightedText(user.employeeId, query)}
      </p>
      {user.skills && user.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {user.skills.map((skill, idx) => (
            <span key={idx} className="px-1.5 py-0.2 rounded-md bg-[#5B4CF3]/10 text-[#5B4CF3] text-[9px] font-semibold">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
    <button
      onClick={() => onAdd(user._id)}
      disabled={isAdding}
      aria-label={`Add ${user.name}`}
      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-xs hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
    >
      {isAdding ? <Spinner size="sm" /> : "Add"}
    </button>
  </li>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

export const AddParticipantModal = ({
  caseId,
  existingParticipantIds,
  isOpen,
  onClose,
  onAdded,
}: AddParticipantModalProps): JSX.Element => {
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<CaseRole>("Editor");
  const [results, setResults] = useState<User[]>([]);
  const [recommendations, setRecommendations] = useState<ParticipantRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedRole("Editor");
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      setAddingUserId(null);
      setAddError(null);
      setHasSearched(false);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Fetch AI recommendations
      setIsLoadingRecs(true);
      aiService.recommendParticipants(caseId)
        .then((recs) => setRecommendations(recs))
        .catch((err) => console.error("Failed to load recommendations:", err))
        .finally(() => setIsLoadingRecs(false));
    }
  }, [isOpen, caseId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      if (trimmed.length < SEARCH_MIN_LENGTH) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);

      try {
        const found = await searchUsers(trimmed, existingParticipantIds);
        setResults(found);
      } catch {
        setSearchError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [existingParticipantIds],
  );

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    setAddError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSearch(value);
    }, DEBOUNCE_MS);
  };

  const handleAdd = async (userId: string) => {
    setAddingUserId(userId);
    setAddError(null);

    try {
      await updateParticipants(caseId, "add", userId, selectedRole);
      onAdded();
      onClose();
    } catch {
      setAddError("Failed to add participant. Please try again.");
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Participant" size="md">
      {/* Role Selection */}
      <div className="mb-4">
        <label
          htmlFor="add-participant-role"
          className="block text-xs font-bold text-slate-900 mb-1"
        >
          Assign Role
        </label>
        <select
          id="add-participant-role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as CaseRole)}
          className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
        >
          <option value="Editor">Editor (Can post/edit messages & evidence)</option>
          <option value="Observer">Observer / Read-Only (View only)</option>
          <option value="Admin">Admin (Full control)</option>
        </select>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <label
          htmlFor="add-participant-search"
          className="block text-xs font-bold text-slate-900 mb-1"
        >
          Search by name or employee ID
        </label>
        <input
          ref={inputRef}
          id="add-participant-search"
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="e.g. Alice or EMP001"
          autoComplete="off"
          className="w-full h-[48px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 text-xs font-normal text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
        />
      </div>

      {/* Add error */}
      {addError && (
        <p className="mb-3 text-xs text-red-500 font-medium" role="alert">
          {addError}
        </p>
      )}

      {/* Search error */}
      {searchError && (
        <p className="mb-3 text-xs text-red-500 font-medium" role="alert">
          {searchError}
        </p>
      )}

      {/* Results area */}
      <div className="min-h-36 max-h-72 overflow-y-auto">
        {isSearching ? (
          <div className="flex items-center justify-center h-24">
            <Spinner size="md" />
          </div>
        ) : !query.trim() ? (
          /* AI Recommendations when search is empty */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5B4CF3]" />
                AI Recommended Team Members
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Based on skills & history</span>
            </div>

            {isLoadingRecs ? (
              <div className="flex justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No active recommendations available. Type above to search team.
              </p>
            ) : (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li
                    key={rec.user._id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#5B4CF3]/40 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <Avatar name={rec.user.name} size="sm" src={rec.user.profilePictureUrl} />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">{rec.user.name}</p>
                          {rec.user.roleName && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold">
                              {rec.user.roleName}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3] text-[9px] font-extrabold">
                            Match Score: {rec.matchPercentage}/100
                          </span>
                          {rec.availabilityStatus && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              rec.availabilityStatus === "High Availability"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}>
                              {rec.availabilityStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 truncate">{rec.reason}</p>
                        {rec.pastCasesTitles && rec.pastCasesTitles.length > 0 && (
                          <p className="text-[9px] text-purple-700 dark:text-purple-300 italic truncate">
                            Past cases: {rec.pastCasesTitles.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAdd(rec.user._id)}
                      disabled={addingUserId === rec.user._id}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-xs hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      {addingUserId === rec.user._id ? <Spinner size="sm" /> : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : hasSearched && results.length === 0 ? (
          <p
            id="no-results-message"
            className="text-xs font-medium text-slate-400 text-center py-8"
          >
            No users found.
          </p>
        ) : (
          <ul
            role="list"
            aria-label="User search results"
            className="space-y-1"
          >
            {results.map((user) => (
              <UserResultRow
                key={user._id}
                user={user}
                query={query}
                isAdding={addingUserId === user._id}
                onAdd={handleAdd}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};
