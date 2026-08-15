import { useState, useMemo, useEffect, useRef } from "react";
import type { JSX, ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCases } from "../../hooks/useCases";
import { CaseListItem } from "./CaseListItem";
import { CreateCaseModal } from "./CreateCaseModal";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { CaseListSkeleton } from "../ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { ProfileModal } from "../profile/ProfileModal";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";
import { Sparkles, SlidersHorizontal, X } from "lucide-react";
import aiService from "../../services/aiService";
import type { Case } from "../../types";

const SearchIcon = (): JSX.Element => (
  <svg
    className="h-4 w-4 text-slate-400 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const PlusIcon = (): JSX.Element => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const UserIcon = (): JSX.Element => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const LockIcon = (): JSX.Element => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const LogoutIcon = (): JSX.Element => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const filterAndSortCases = (
  cases: Case[],
  query: string,
  priority: string,
  category: string,
  sortBy: "recent" | "priority",
): Case[] => {
  const filtered = cases.filter((c) => {
    if (query.trim()) {
      const lower = query.toLowerCase();
      if (!c.title.toLowerCase().includes(lower)) return false;
    }
    if (priority) {
      if ((c.priority || "Medium") !== priority) return false;
    }
    if (category) {
      if (c.category !== category) return false;
    }
    return true;
  });

  if (sortBy === "priority") {
    return [...filtered].sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority || "Medium"] || 0;
      const pB = PRIORITY_ORDER[b.priority || "Medium"] || 0;
      return pB - pA;
    });
  }

  return filtered;
};

export const CaseSidebar = ({ onClose }: { onClose?: () => void } = {}): JSX.Element => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onClose?.();
  }, [location.pathname, onClose]);

  const {
    pinnedCases,
    unpinnedCases,
    unreadCounts,
    isLoading,
    error,
    fetchCases,
    pinCase,
    unpinCase,
  } = useCases();

  const [searchQuery, setSearchQuery] = useState("");
  const [useAISearch, setUseAISearch] = useState(false);
  const [aiResults, setAiResults] = useState<Array<Case & { relevanceScore?: number }>>([]);
  const [isAISearching, setIsAISearching] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "priority">("recent");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // AI Semantic search debounced effect
  useEffect(() => {
    if (!useAISearch || !searchQuery.trim()) {
      setAiResults([]);
      setIsAISearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAISearching(true);
      try {
        const results = await aiService.searchCases(searchQuery.trim());
        setAiResults(results);
      } catch (err) {
        console.error("AI Search error:", err);
      } finally {
        setIsAISearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [useAISearch, searchQuery]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterSheetOpen(false);
      }
    };

    if (isProfileMenuOpen || isFilterSheetOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen, isFilterSheetOpen]);

  const filteredPinned = useMemo(
    () => filterAndSortCases(pinnedCases, searchQuery, priorityFilter, categoryFilter, sortBy),
    [pinnedCases, searchQuery, priorityFilter, categoryFilter, sortBy],
  );

  const filteredUnpinned = useMemo(
    () => filterAndSortCases(unpinnedCases, searchQuery, priorityFilter, categoryFilter, sortBy),
    [unpinnedCases, searchQuery, priorityFilter, categoryFilter, sortBy],
  );

  const totalCases = pinnedCases.length + unpinnedCases.length;
  const hasNoResults =
    (searchQuery.trim() !== "" || priorityFilter !== "" || categoryFilter !== "") &&
    filteredPinned.length === 0 &&
    filteredUnpinned.length === 0;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleCaseCreated = (newCase: Case) => {
    void fetchCases();
    navigate(`/case/${newCase._id}`);
  };

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  return (
    <>
      {/* Sidebar Container */}
      <aside className="flex h-full w-full flex-col bg-white">
        
        {/* Clean Header: Logo & Profile */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-4">
          <div
            onClick={() => navigate("/")}
            title="Return to Dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
          >
            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="md:hidden mr-1 p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">CaseRoom</span>
          </div>

          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`flex items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-indigo-500/20 ${
                    isProfileMenuOpen ? "ring-2 ring-indigo-600" : ""
                  }`}
                  aria-label="Toggle profile menu"
                  title={user.name}
                >
                  <Avatar
                    name={user.name}
                    size="sm"
                    src={user.profilePictureUrl}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 truncate">
                        {user.employeeId}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <UserIcon />
                      My Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <LockIcon />
                      Settings
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogoutIcon />
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Compact Search & Filter Section */}
        <div className="border-b border-slate-100 p-3 flex flex-col gap-2 relative">
          {/* Search Bar + Filter Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all">
              <SearchIcon />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={useAISearch ? "AI Search (semantic intent)…" : "Search active cases…"}
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 font-normal"
                aria-label="Filter cases"
              />
              <button
                type="button"
                onClick={() => setUseAISearch(!useAISearch)}
                title={useAISearch ? "Switch to standard search" : "Switch to AI semantic search"}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 ${
                  useAISearch
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200/80 text-slate-600 hover:bg-slate-300"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI</span>
              </button>
            </div>

            {/* Single Filter Button */}
            <div className="relative shrink-0" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(!isFilterSheetOpen)}
                title="Filter and Sort options"
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                  priorityFilter || categoryFilter || sortBy === "priority" || isFilterSheetOpen
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Filter and Sort"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(priorityFilter || categoryFilter || sortBy === "priority") && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-2 ring-white" />
                )}
              </button>

              {/* Filter & Sort Popover Sheet */}
              {isFilterSheetOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                    <span className="text-xs font-bold text-slate-900">Filter & Sort</span>
                    <button
                      type="button"
                      onClick={() => setIsFilterSheetOpen(false)}
                      className="p-1 rounded text-slate-400 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sort By Section */}
                  <div className="mb-3 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sort By</label>
                    <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setSortBy("recent")}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                          sortBy === "recent"
                            ? "bg-white text-indigo-600 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Recent
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy("priority")}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                          sortBy === "priority"
                            ? "bg-white text-indigo-600 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        By Priority
                      </button>
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div className="mb-2.5 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="mb-3 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">All Categories</option>
                      <option value="Incident">Incident</option>
                      <option value="HR">HR</option>
                      <option value="Engineering">Engineering</option>
                    </select>
                  </div>

                  {(priorityFilter || categoryFilter || sortBy !== "recent") && (
                    <button
                      type="button"
                      onClick={() => {
                        setPriorityFilter("");
                        setCategoryFilter("");
                        setSortBy("recent");
                      }}
                      className="w-full py-1 text-center text-[11px] font-bold text-indigo-600 hover:underline border-t border-slate-100 pt-2"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Case list */}
        <div className="flex-1 overflow-y-auto px-1.5 py-2 md:px-1.5">
          {isLoading && <CaseListSkeleton />}

          {!isLoading && error && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <p className="text-xs text-red-500 font-medium">{error}</p>
              <button
                type="button"
                onClick={fetchCases}
                className="mt-3 text-xs font-bold text-[#5B4CF3] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && useAISearch && searchQuery.trim() && (
            <div>
              <p className="px-3 pb-1.5 pt-1 text-xs font-black tracking-wider text-[#5B4CF3] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5B4CF3]" /> AI SEARCH RESULTS
              </p>
              {isAISearching ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium animate-pulse">
                  Searching semantically across cases…
                </div>
              ) : aiResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                  No semantically matching cases found.
                </div>
              ) : (
                aiResults.map((c) => (
                  <CaseListItem
                    key={c._id}
                    caseData={c}
                    unreadCount={unreadCounts[c._id] ?? 0}
                    onPin={() =>
                      pinCase(c._id).catch((e) => alert(e.message))
                    }
                    onUnpin={() =>
                      unpinCase(c._id).catch((e) => alert(e.message))
                    }
                  />
                ))
              )}
            </div>
          )}

          {!isLoading && !error && (!useAISearch || !searchQuery.trim()) && totalCases === 0 && (
            <EmptyState
              title="No cases yet"
              description="Create an IT case to start collaborating with your team."
              action={{ label: "New Case", onClick: openCreateModal }}
            />
          )}

          {!isLoading && !error && (!useAISearch || !searchQuery.trim()) && hasNoResults && (
            <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
              No cases match &ldquo;{searchQuery}&rdquo;
            </div>
          )}

          {!isLoading && !error && (!useAISearch || !searchQuery.trim()) && !hasNoResults && (
            <>
              {/* Item 9: Pinned section with Pin emoji/icon */}
              {filteredPinned.length > 0 && (
                <section aria-label="Pinned cases" className="mb-3">
                  <p className="px-3 pb-1.5 pt-1 text-xs font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>📌</span> PINNED
                  </p>
                  {filteredPinned.map((c) => (
                    <CaseListItem
                      key={c._id}
                      caseData={c}
                      unreadCount={unreadCounts[c._id] ?? 0}
                      onPin={() =>
                        pinCase(c._id).catch((e) => alert(e.message))
                      }
                      onUnpin={() =>
                        unpinCase(c._id).catch((e) => alert(e.message))
                      }
                    />
                  ))}
                </section>
              )}

              {/* All cases section */}
              {filteredUnpinned.length > 0 && (
                <section aria-label="All cases">
                  {filteredPinned.length > 0 && (
                    <div className="mx-3 my-2 border-t border-slate-100" />
                  )}
                  <p className="px-3 pb-1.5 pt-1 text-xs font-black tracking-wider text-slate-400">
                    ALL CASES
                  </p>
                  {filteredUnpinned.map((c) => (
                    <CaseListItem
                      key={c._id}
                      caseData={c}
                      unreadCount={unreadCounts[c._id] ?? 0}
                      onPin={() =>
                        pinCase(c._id).catch((e) => alert(e.message))
                      }
                      onUnpin={() =>
                        unpinCase(c._id).catch((e) => alert(e.message))
                      }
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>

        {/* Clean "+ New Case" button */}
        <div className="border-t border-slate-100 p-3 bg-white">
          <button
            type="button"
            id="new-case-button"
            onClick={openCreateModal}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white shadow-2xs transition-all active:scale-[0.98]"
          >
            <PlusIcon />
            New Case
          </button>
        </div>
      </aside>

      {/* Modals */}
      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreated={handleCaseCreated}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
