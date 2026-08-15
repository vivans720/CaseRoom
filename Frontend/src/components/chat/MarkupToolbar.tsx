import { useState, type FC, type KeyboardEvent } from "react";
import {
  MousePointer,
  Pen,
  Highlighter,
  Type,
  Square,
  ArrowUpRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  MessageSquare,
  Sparkles,
  Undo2,
  Redo2,
  Maximize2,
  ScanLine,
} from "lucide-react";
import type { AnnotationTool } from "../../types";

export interface MarkupToolbarProps {
  activeTool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  color: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  rotation: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClearAnnotations?: () => void;
  onDownload: () => void;
  onClose: () => void;
  showNotesSidebar: boolean;
  onToggleNotesSidebar: () => void;
  showAiSidebar?: boolean;
  onToggleAiSidebar?: () => void;
  annotationCount: number;
  isPdf: boolean;
}

const PRESET_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
];

const STROKE_WIDTHS = [
  { label: "S", value: 2, title: "Small (2px)" },
  { label: "M", value: 4, title: "Medium (4px)" },
  { label: "L", value: 8, title: "Large (8px)" },
];

export const MarkupToolbar: FC<MarkupToolbarProps> = ({
  activeTool,
  onSelectTool,
  color,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onFitPage,
  onRotateLeft,
  onRotateRight,
  onUndo,
  canUndo = false,
  onRedo,
  canRedo = false,
  currentPage,
  totalPages,
  onPageChange,
  onDownload,
  onClose,
  showNotesSidebar,
  onToggleNotesSidebar,
  showAiSidebar = false,
  onToggleAiSidebar,
  annotationCount,
  isPdf,
}) => {
  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  const handlePageInputCommit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= (totalPages || 1)) {
      onPageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setPageInput(String(currentPage));
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2 text-white z-40 select-none">
      <div className="flex flex-wrap items-center gap-3">
        {/* GROUP 1: Annotation Tools */}
        <div
          role="toolbar"
          aria-label="Annotation tools"
          className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/90 shadow-inner"
        >
          <button
            type="button"
            onClick={() => onSelectTool("select")}
            title="Select & Inspect Annotation (V)"
            aria-label="Select annotation"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "select"
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60 shadow-indigo-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("pen")}
            title="Freehand Pen (P)"
            aria-label="Freehand Pen"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "pen"
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60 shadow-indigo-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            <Pen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("highlighter")}
            title="Highlighter Tool (H)"
            aria-label="Highlighter"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "highlighter"
                ? "bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-300 font-bold shadow-amber-500/25"
                : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/70"
            }`}
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("text")}
            title="Add Text Note (T)"
            aria-label="Add Text"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "text"
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60 shadow-indigo-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("rectangle")}
            title="Draw Box / Rectangle (R)"
            aria-label="Draw Rectangle"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "rectangle"
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60 shadow-indigo-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("arrow")}
            title="Draw Arrow Pointer (A)"
            aria-label="Draw Arrow"
            className={`p-1.5 rounded-md transition-all duration-150 ${
              activeTool === "arrow"
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60 shadow-indigo-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* GROUP 2: Color & Stroke Styling */}
        <div
          role="group"
          aria-label="Color and stroke style"
          className="flex items-center space-x-2.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/90"
        >
          <div className="flex items-center space-x-1.5" title="Annotation color">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChangeColor(c.value)}
                title={`${c.label} color`}
                aria-label={`${c.label} color`}
                style={{ backgroundColor: c.value }}
                className={`w-4 h-4 rounded-full border border-slate-600/80 transition-all duration-150 ${
                  color.toLowerCase() === c.value.toLowerCase()
                    ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 scale-110"
                    : "hover:scale-110 opacity-80 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <div className="h-3.5 w-px bg-slate-800" />

          {/* Stroke Width Buttons */}
          <div className="flex items-center space-x-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => onChangeStrokeWidth(w.value)}
                title={w.title}
                aria-label={w.title}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                  strokeWidth === w.value
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        {isPdf && <div className="h-5 w-px bg-slate-800 hidden sm:block" />}

        {/* GROUP 3: Page Navigation (Editable Page Box) */}
        {isPdf && (
          <div
            role="navigation"
            aria-label="PDF page navigation"
            className="flex items-center space-x-1 bg-slate-950/60 px-1.5 py-1 rounded-lg border border-slate-800/90 text-xs text-slate-300"
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              title="Previous Page ([)"
              aria-label="Previous page"
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <span className="text-slate-500">Pg</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Page number"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputCommit}
                onKeyDown={handlePageInputKeyDown}
                className="w-8 text-center bg-slate-900 border border-slate-700/80 rounded py-0.5 px-1 text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-slate-500">/ {totalPages || 1}</span>
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              title="Next Page (])"
              aria-label="Next page"
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* GROUP 4: Viewport, Fit, Zoom & History */}
        <div
          role="group"
          aria-label="View and history controls"
          className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/90 text-xs"
        >
          {/* Zoom Out */}
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom (0)"
            aria-label="Reset zoom"
            className="px-1.5 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Fit Width */}
          {onFitWidth && (
            <button
              type="button"
              onClick={onFitWidth}
              title="Fit to width"
              aria-label="Fit to width"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ScanLine className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fit Page */}
          {onFitPage && (
            <button
              type="button"
              onClick={onFitPage}
              title="Fit entire page"
              aria-label="Fit entire page"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Undo / Redo */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo annotation (Cmd/Ctrl+Z)"
              aria-label="Undo"
              className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo annotation (Cmd/Ctrl+Shift+Z)"
              aria-label="Redo"
              className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Rotate */}
          <button
            type="button"
            onClick={onRotateLeft}
            title="Rotate counter-clockwise"
            aria-label="Rotate counter-clockwise"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRotateRight}
            title="Rotate clockwise"
            aria-label="Rotate clockwise"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GROUP 5: Actions & Sidebar Toggles */}
      <div className="flex items-center space-x-2 ml-auto">
        {onToggleAiSidebar && (
          <button
            type="button"
            onClick={onToggleAiSidebar}
            title="AI Document Assistant"
            aria-label="AI Document Assistant"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
              showAiSidebar
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-400/80 shadow-indigo-500/25"
                : "bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/80 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Ask AI</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleNotesSidebar}
          title="Document Notes & Annotations"
          aria-label="Notes & Annotations"
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showNotesSidebar
              ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
              : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>Notes ({annotationCount})</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          title="Download original file"
          aria-label="Download original file"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close document viewer (Esc)"
          aria-label="Close document viewer"
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
