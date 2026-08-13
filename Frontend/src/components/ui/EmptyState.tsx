import type { JSX } from "react"

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
}

export const EmptyState = ({
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps): JSX.Element => {
  return (
    <div className="relative flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
      
      {/* Radial Purple Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-gradient-to-tr from-purple-500/20 via-indigo-400/20 to-transparent blur-3xl pointer-events-none" />

      {/* 3D Illustration Container (15% larger, max-w-[280px]) */}
      <div className="relative mb-6 w-full max-w-[280px] overflow-hidden rounded-2xl border border-purple-200/70 bg-gradient-to-b from-purple-100/40 via-purple-50/60 to-white p-3.5 shadow-[0_20px_40px_-10px_rgba(91,76,243,0.14),inset_0_1px_2px_rgba(255,255,255,1)] transition-transform duration-500 hover:scale-[1.03]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,46,255,0.12),transparent_70%)] pointer-events-none" />
        <img 
          src="/3d_hero.png" 
          alt="IT Case Room Platform" 
          className="relative z-10 w-full h-auto max-h-[160px] rounded-xl object-contain opacity-100 animate-[pulse_6s_ease-in-out_infinite]"
        />
      </div>

      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-snug">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed max-w-sm">
          {description}
        </p>
      )}

      {/* Dual Quick Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-5 py-3 text-xs font-bold text-white shadow-[0_14px_35px_rgba(91,76,243,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(91,76,243,0.55)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {action.label}
          </button>
        )}

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:border-purple-300 hover:text-[#5B4CF3] hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
