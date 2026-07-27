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

const filterCases = (
  cases: Case[],
  query: string,
  priority: string,
  category: string,
): Case[] => {
  return cases.filter((c) => {
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
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const filteredPinned = useMemo(
    () => filterCases(pinnedCases, searchQuery, priorityFilter, categoryFilter),
    [pinnedCases, searchQuery, priorityFilter, categoryFilter],
  );

  const filteredUnpinned = useMemo(
    () => filterCases(unpinnedCases, searchQuery, priorityFilter, categoryFilter),
    [unpinnedCases, searchQuery, priorityFilter, categoryFilter],
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
      <aside className="flex h-screen w-full shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl">
        
        {/* Item 11 & 15: Polished Balanced Header with Top Quick-Create (+) Button */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.02] cursor-pointer">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden mr-1 p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-md shadow-[#5B4CF3]/30">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">CaseRoom</span>
          </div>

          <div className="flex items-center gap-2 relative" ref={menuRef}>
            
            {/* Top Quick Create (+) Button */}
            <button
              type="button"
              onClick={openCreateModal}
              title="Create new case"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#5B4CF3] border border-purple-200/60 hover:bg-[#5B4CF3] hover:text-white hover:border-[#5B4CF3] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <PlusIcon />
            </button>

            {user && (
              <>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`flex items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-[#5B4CF3]/30 ${
                    isProfileMenuOpen ? "ring-2 ring-[#5B4CF3]" : ""
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#5B4CF3]"
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#5B4CF3]"
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
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

        {/* Item 4 & 5: Taller 44px Search input & Unified Filter Bar */}
        <div className="border-b border-slate-100 px-3.5 py-3 flex flex-col gap-2.5">
          
          {/* Taller Search Bar (44px) */}
          <div className="flex items-center gap-2.5 h-[44px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 focus-within:border-[#5B4CF3] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5B4CF3]/15 transition-all duration-200">
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search active cases…"
              className="flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-500 placeholder:font-medium font-normal"
              aria-label="Filter cases"
            />
          </div>

          {/* Unified Filter Bar Wrapper */}
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#5B4CF3] focus:ring-2 focus:ring-[#5B4CF3]/20 transition-all shadow-2xs"
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#5B4CF3] focus:ring-2 focus:ring-[#5B4CF3]/20 transition-all shadow-2xs"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              <option value="Incident">Incident</option>
              <option value="HR">HR</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>
        </div>

        {/* Case list */}
        <div className="flex-1 overflow-y-auto px-1.5 py-2">
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

          {!isLoading && !error && totalCases === 0 && (
            <EmptyState
              title="No cases yet"
              description="Create an IT case to start collaborating with your team."
              action={{ label: "New Case", onClick: openCreateModal }}
            />
          )}

          {!isLoading && !error && hasNoResults && (
            <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
              No cases match &ldquo;{searchQuery}&rdquo;
            </div>
          )}

          {!isLoading && !error && !hasNoResults && (
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

        {/* Item 10: 56px Tall Elevated "+ New Case" button */}
        <div className="border-t border-slate-100 p-3.5 bg-white">
          <button
            type="button"
            id="new-case-button"
            onClick={openCreateModal}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 text-xs font-bold text-white shadow-[0_14px_35px_rgba(91,76,243,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(91,76,243,0.55)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0"
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
