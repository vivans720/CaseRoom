import type { JSX } from "react";
import { Briefcase, Sparkles, FolderPlus, ShieldCheck } from "lucide-react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export const EmptyState = ({
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps): JSX.Element => {
  return (
    <div className="relative flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/15 via-indigo-400/15 to-transparent blur-3xl pointer-events-none" />

      {/* Bespoke CaseRoom Workspace Badge Illustration */}
      <div className="relative mb-5">
        <div className="w-22 h-22 rounded-3xl bg-gradient-to-br from-white via-indigo-50/80 to-purple-50/80 border border-indigo-100/90 shadow-[0_16px_32px_-8px_rgba(91,76,243,0.16)] flex items-center justify-center relative">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#5B4CF3] to-[#8B2EFF] text-white flex items-center justify-center shadow-md">
            <Briefcase className="w-6 h-6" />
          </div>
          {/* Accent Mini Badges */}
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-xl bg-white border border-purple-100 shadow-2xs flex items-center justify-center text-amber-500">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-extrabold tracking-tight text-slate-900 leading-snug">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed max-w-xs">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5B4CF3]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[#5B4CF3]/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:border-purple-300 hover:text-[#5B4CF3] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
