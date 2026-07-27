import { useState, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCaseById,
  archiveCase,
  unarchiveCase,
  updateCaseStatus,
  deleteCase,
  exportCasePdf,
} from "../../services/caseService";
import { useAuth } from "../../hooks/useAuth";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Spinner } from "../ui/Spinner";
import type { Case, CaseStatus } from "../../types";

interface CaseSettingsPanelProps {
  caseId: string;
  onClose?: () => void;
}

export const CaseSettingsPanel = ({
  caseId,
  onClose,
}: CaseSettingsPanelProps): JSX.Element => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isUnarchiveDialogOpen, setIsUnarchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (!caseData || caseData.status === newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateCaseStatus(caseId, newStatus);
      setCaseData(updated);
      window.dispatchEvent(new Event("caseroom:refresh_cases"));
    } catch {
      setError("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportPdf = async () => {
    if (!caseData) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportCasePdf(caseId, caseData.title);
    } catch {
      setExportError("Failed to export chat to PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchCase = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetched = await getCaseById(caseId);
        if (!cancelled) setCaseData(fetched);
      } catch {
        if (!cancelled) setError("Failed to load case settings.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchCase();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleArchive = async () => {
    try {
      await archiveCase(caseId);
      window.dispatchEvent(new Event("caseroom:refresh_cases"));
      navigate("/");
    } catch {
      setError("Failed to archive case.");
    }
  };
  const handleUnarchive = async () => {
    try {
      await unarchiveCase(caseId);
      window.dispatchEvent(new Event("caseroom:refresh_cases"));
      navigate("/");
    } catch {
      setError("Failed to unarchive case.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCase(caseId);
      window.dispatchEvent(new Event("caseroom:refresh_cases"));
      navigate("/");
    } catch {
      setError("Failed to delete case.");
    }
  };

  if (isLoading) {
    return (
      <aside className="absolute inset-y-0 right-0 z-40 flex h-full w-full md:relative md:w-[300px] shrink-0 items-center justify-center border-l border-slate-200/80 bg-white/90 p-6 shadow-xl md:shadow-none">
        <Spinner />
      </aside>
    );
  }

  if (error || !caseData) {
    return (
      <aside className="absolute inset-y-0 right-0 z-40 h-full w-full md:relative md:w-[300px] shrink-0 border-l border-slate-200/80 bg-white/90 p-6 shadow-xl md:shadow-none">
        <p className="text-xs font-medium text-red-500">{error ?? "Case not found."}</p>
      </aside>
    );
  }

  const creatorId =
    typeof caseData.creatorId === "object" && caseData.creatorId !== null
      ? caseData.creatorId._id
      : caseData.creatorId;
  const isCreator = user?._id === creatorId;
  const isArchived = caseData.status === "archived";

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex h-full w-full md:relative md:w-[300px] shrink-0 flex-col overflow-y-auto border-l border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl md:shadow-none animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
              aria-label="Close case settings"
              title="Close settings"
            >
              ✕
            </button>
          )}
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            Case Settings
          </h3>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* State Display */}
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            LIFECYCLE STATUS
          </h4>
          {isArchived ? (
            <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/60 rounded-xl p-3">
              Archived (Read-only)
            </p>
          ) : (
            <select
              value={caseData.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
              className="w-full h-[46px] bg-slate-50/70 border border-slate-200/90 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 outline-none transition-all disabled:opacity-50"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="active">Active (Legacy)</option>
            </select>
          )}
        </div>

        {/* Export Chat to PDF (Archived cases only) */}
        {isArchived && (
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              ACTIONS
            </h4>
            <div className="mt-2">
              <button
                type="button"
                id="export-pdf-btn"
                disabled={isExporting}
                onClick={handleExportPdf}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-3 text-xs font-bold text-white shadow-xs hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Spinner size="sm" className="text-white shrink-0 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <span>Export Chat to PDF</span>
                )}
              </button>
              {exportError && (
                <p className="mt-2 text-xs text-red-500 font-medium" id="export-error-msg">
                  {exportError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Creator only actions */}
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            DANGER ZONE
          </h4>

          {!isCreator ? (
            <p className="mt-2 text-xs italic text-slate-400 font-medium">
              Only the creator can modify these settings.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() =>
                  isArchived
                    ? setIsUnarchiveDialogOpen(true)
                    : setIsArchiveDialogOpen(true)
                }
                className="w-full rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-left text-xs font-bold text-amber-700 transition-all duration-200 hover:bg-amber-600 hover:text-white"
              >
                {isArchived ? "Unarchive Case" : "Archive Case"}
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full rounded-xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-left text-xs font-bold text-red-600 transition-all duration-200 hover:bg-red-600 hover:text-white"
              >
                Delete Case
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isArchiveDialogOpen}
        title="Archive Case"
        description="Are you sure you want to archive this case? It will become read-only and no new messages can be added."
        confirmText="Archive"
        onConfirm={handleArchive}
        onCancel={() => setIsArchiveDialogOpen(false)}
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={isUnarchiveDialogOpen}
        title="Unarchive Case"
        description="Are you sure you want to unarchive this case? It will become active and participants will be able to send messages again."
        confirmText="Unarchive"
        onConfirm={handleUnarchive}
        onCancel={() => setIsUnarchiveDialogOpen(false)}
        isDestructive={false}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Case"
        description="Are you sure you want to permanently delete this case and all its messages? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        isDestructive={true}
      />
    </aside>
  );
};
