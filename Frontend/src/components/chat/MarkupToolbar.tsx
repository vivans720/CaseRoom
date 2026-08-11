import type { FC } from "react";
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
  Trash2,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { AnnotationTool } from "../../types";

interface MarkupToolbarProps {
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
  rotation: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClearAnnotations: () => void;
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
  "#ef4444", // Red
  "#eab308", // Yellow / Highlight
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ffffff", // White
  "#000000", // Black
];

const STROKE_WIDTHS = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
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
  onRotateLeft,
  onRotateRight,
  currentPage,
  totalPages,
  onPageChange,
  onClearAnnotations,
  onDownload,
  onClose,
  showNotesSidebar,
  onToggleNotesSidebar,
  showAiSidebar = false,
  onToggleAiSidebar,
  annotationCount,
  isPdf,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 text-white z-50">
      {/* Tool Selection Group */}
      <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-3">
        <button
          type="button"
          onClick={() => onSelectTool("select")}
          title="Select & Inspect Annotation"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "select"
              ? "bg-indigo-600 text-white"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool("pen")}
          title="Freehand Pen"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "pen"
              ? "bg-indigo-600 text-white"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Pen className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool("highlighter")}
          title="Highlighter Tool"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "highlighter"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "hover:bg-slate-800 text-amber-400"
          }`}
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool("text")}
          title="Add Text Note"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "text"
              ? "bg-indigo-600 text-white"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Type className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool("rectangle")}
          title="Draw Box / Rectangle"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "rectangle"
              ? "bg-indigo-600 text-white"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool("arrow")}
          title="Draw Arrow Pointer"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === "arrow"
              ? "bg-indigo-600 text-white"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Color & Stroke Width Settings */}
      <div className="flex items-center space-x-3 border-r border-slate-700/60 pr-3">
        <div className="flex items-center space-x-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChangeColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border border-slate-600 transition-transform ${
                color === c ? "ring-2 ring-indigo-400 scale-110" : "hover:scale-105"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-md border border-slate-700">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => onChangeStrokeWidth(w.value)}
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                strokeWidth === w.value
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* PDF Page Controls (if PDF) */}
      {isPdf && (
        <div className="flex items-center space-x-2 border-r border-slate-700/60 pr-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-300 font-mono">
            Page {currentPage} / {totalPages || 1}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zoom & Rotation Controls */}
      <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-3">
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          className="text-xs text-slate-400 font-mono hover:text-white px-1"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRotateLeft}
          title="Rotate Counter-Clockwise"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRotateRight}
          title="Rotate Clockwise"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Actions & Sidebar Toggle */}
      <div className="flex items-center space-x-2 ml-auto">
        <button
          type="button"
          onClick={onToggleAiSidebar}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all ${
            showAiSidebar
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-400"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>

        <button
          type="button"
          onClick={onToggleNotesSidebar}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            showNotesSidebar
              ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Notes ({annotationCount})</span>
        </button>

        <button
          type="button"
          onClick={onClearAnnotations}
          title="Clear Annotations"
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onDownload}
          title="Download File"
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close Preview"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
