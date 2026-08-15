import { useState, useEffect, useRef, useEffectEvent, useCallback, type FC } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Trash2,
  User as UserIcon,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { MarkupToolbar } from "./MarkupToolbar";
import { PdfDocument } from "./PdfDocument";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { annotationService } from "../../services/annotationService";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { SocketContext } from "../../contexts/SocketContext";
import type { Annotation, AnnotationTool } from "../../types";
import { DocumentQAPanel } from "./DocumentQAPanel";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  caseId: string;
  messageId?: string;
  fileMimeType?: string;
  senderName?: string;
}

type UndoAction =
  | { type: "add"; annotation: Annotation }
  | { type: "delete"; annotation: Annotation }
  | { type: "update"; previous: Annotation; current: Annotation };

export const DocumentPreviewModal: FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document",
  caseId,
  messageId,
  fileMimeType,
  senderName,
}) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket ?? null;

  const isPdf =
    Boolean(fileMimeType?.includes("pdf")) ||
    fileUrl?.toLowerCase().endsWith(".pdf") ||
    fileName?.toLowerCase().endsWith(".pdf");

  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("#ef4444");
  const [editStrokeWidth, setEditStrokeWidth] = useState(4);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "just-saved">("saved");
  const [showNotesSidebar, setShowNotesSidebar] = useState(false);
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  const documentViewportRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pdfDocument, numPages, isLoading: isPdfLoading, error: pdfError } =
    usePdfDocument(isPdf ? fileUrl : undefined);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  // Image size state for non-PDF image documents
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
  const [isImageLoading, setIsImageLoading] = useState(!isPdf);

  const triggerSavedFeedback = useCallback(() => {
    setSaveStatus("just-saved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
    }, 2500);
  }, []);

  // Fetch initial annotations
  useEffect(() => {
    if (!isOpen || !caseId || !fileUrl) return;

    let isMounted = true;
    annotationService
      .getAnnotations(caseId, fileUrl, messageId)
      .then((data) => {
        if (isMounted) {
          setAnnotations(data);
          setSaveStatus("saved");
        }
      })
      .catch((err) => {
        console.error("Failed to load annotations:", err);
      });

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isOpen, caseId, fileUrl, messageId]);

  // Real-time socket listeners for live markup sync
  useEffect(() => {
    if (!socket || !caseId) return;

    const handleCreated = ({ caseId: cId, annotation }: { caseId: string; annotation: Annotation }) => {
      if (cId === caseId && annotation.fileUrl === fileUrl) {
        setAnnotations((prev) => [...prev.filter((a) => a._id !== annotation._id), annotation]);
        triggerSavedFeedback();
      }
    };

    const handleUpdated = ({ caseId: cId, annotation }: { caseId: string; annotation: Annotation }) => {
      if (cId === caseId && annotation.fileUrl === fileUrl) {
        setAnnotations((prev) => prev.map((a) => (a._id === annotation._id ? annotation : a)));
        triggerSavedFeedback();
      }
    };

    const handleDeleted = ({ caseId: cId, annotationId }: { caseId: string; annotationId: string }) => {
      if (cId === caseId) {
        setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
        triggerSavedFeedback();
      }
    };

    socket.on("annotation:created", handleCreated);
    socket.on("annotation:updated", handleUpdated);
    socket.on("annotation:deleted", handleDeleted);

    return () => {
      socket.off("annotation:created", handleCreated);
      socket.off("annotation:updated", handleUpdated);
      socket.off("annotation:deleted", handleDeleted);
    };
  }, [socket, caseId, fileUrl, triggerSavedFeedback]);

  const selectedAnnotation = annotations.find((ann) => ann._id === selectedAnnotationId) ?? null;

  useEffect(() => {
    if (!selectedAnnotation) return;

    setEditText(selectedAnnotation.text || "");
    setEditColor(selectedAnnotation.style?.color || "#ef4444");
    setEditStrokeWidth(selectedAnnotation.style?.strokeWidth || 4);
  }, [selectedAnnotation]);

  // Handle Image Load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth * zoom,
      height: img.naturalHeight * zoom,
    });
    setIsImageLoading(false);
  };

  // Zoom & Rotation Handlers
  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 4));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
  const handleResetZoom = () => setZoom(1);
  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);

  const handleFitWidth = () => {
    if (!documentViewportRef.current) return;
    const containerWidth = documentViewportRef.current.clientWidth;
    const baseWidth = isPdf ? 800 : imageDimensions.width / zoom;
    const targetZoom = Math.max(0.5, Math.min(3.0, (containerWidth - 64) / baseWidth));
    setZoom(Number(targetZoom.toFixed(2)));
  };

  const handleFitPage = () => {
    if (!documentViewportRef.current) return;
    const containerWidth = documentViewportRef.current.clientWidth;
    const containerHeight = documentViewportRef.current.clientHeight;
    const baseWidth = isPdf ? 800 : imageDimensions.width / zoom;
    const baseHeight = isPdf ? 1100 : imageDimensions.height / zoom;
    const zoomW = (containerWidth - 64) / baseWidth;
    const zoomH = (containerHeight - 64) / baseHeight;
    const targetZoom = Math.max(0.5, Math.min(2.5, Math.min(zoomW, zoomH)));
    setZoom(Number(targetZoom.toFixed(2)));
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, numPages || 1));
    setCurrentPage(nextPage);
    const targetEl = pageRefs.current.get(nextPage);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleVisiblePageChange = useEffectEvent((page: number) => {
    setCurrentPage(page);
  });

  const handlePageRef = useEffectEvent((page: number, element: HTMLDivElement | null) => {
    if (element) pageRefs.current.set(page, element);
    else pageRefs.current.delete(page);
  });

  // Add Annotation
  const handleAddAnnotation = async (
    newAnnData: Omit<Annotation, "_id" | "createdAt" | "updatedAt" | "createdBy">
  ) => {
    try {
      setSaveStatus("saving");
      const created = await annotationService.createAnnotation(caseId, {
        messageId,
        fileUrl,
        pageNumber: newAnnData.pageNumber,
        type: newAnnData.type,
        coordinates: newAnnData.coordinates,
        style: newAnnData.style,
        text: newAnnData.text,
      });

      setAnnotations((prev) => [...prev, created]);
      setUndoStack((prev) => [...prev, { type: "add", annotation: created }]);
      setRedoStack([]);
      triggerSavedFeedback();

      // Emit socket event for co-workers
      if (socket) {
        socket.emit("annotation:create", { caseId, annotation: created });
      }
    } catch (err) {
      console.error("Failed to add annotation:", err);
      setSaveStatus("saved");
    }
  };

  // Delete Annotation
  const handleDeleteAnnotation = async (annId: string) => {
    const annToDelete = annotations.find((a) => a._id === annId);
    try {
      setSaveStatus("saving");
      await annotationService.deleteAnnotation(caseId, annId);
      setAnnotations((prev) => prev.filter((a) => a._id !== annId));
      if (selectedAnnotationId === annId) setSelectedAnnotationId(null);

      if (annToDelete) {
        setUndoStack((prev) => [...prev, { type: "delete", annotation: annToDelete }]);
        setRedoStack([]);
      }
      triggerSavedFeedback();

      if (socket) {
        socket.emit("annotation:delete", { caseId, annotationId: annId, fileUrl });
      }
    } catch (err) {
      console.error("Failed to delete annotation:", err);
      setSaveStatus("saved");
    }
  };

  const handleClearAllAnnotations = async () => {
    try {
      setSaveStatus("saving");
      for (const ann of annotations) {
        await annotationService.deleteAnnotation(caseId, ann._id);
        if (socket) {
          socket.emit("annotation:delete", { caseId, annotationId: ann._id, fileUrl });
        }
      }
      setAnnotations([]);
      setSelectedAnnotationId(null);
      setConfirmClearAll(false);
      triggerSavedFeedback();
    } catch (err) {
      console.error("Failed to clear all annotations:", err);
      setSaveStatus("saved");
    }
  };

  const handleSaveSelectedAnnotation = async () => {
    if (!selectedAnnotation) return;

    try {
      setIsSavingEdit(true);
      setSaveStatus("saving");
      const updated = await annotationService.updateAnnotation(caseId, selectedAnnotation._id, {
        text: editText,
        style: {
          color: editColor,
          strokeWidth: editStrokeWidth,
        },
      });

      setAnnotations((prev) => prev.map((ann) => (ann._id === updated._id ? updated : ann)));
      setUndoStack((prev) => [
        ...prev,
        { type: "update", previous: selectedAnnotation, current: updated },
      ]);
      setRedoStack([]);
      triggerSavedFeedback();

      if (socket) {
        socket.emit("annotation:update", { caseId, annotation: updated, fileUrl });
      }
    } catch (err) {
      console.error("Failed to update annotation:", err);
      setSaveStatus("saved");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Undo / Redo implementation
  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    try {
      setSaveStatus("saving");
      if (lastAction.type === "add") {
        await annotationService.deleteAnnotation(caseId, lastAction.annotation._id);
        setAnnotations((prev) => prev.filter((a) => a._id !== lastAction.annotation._id));
        setRedoStack((prev) => [...prev, lastAction]);
        if (socket) {
          socket.emit("annotation:delete", {
            caseId,
            annotationId: lastAction.annotation._id,
            fileUrl,
          });
        }
      } else if (lastAction.type === "delete") {
        const recreated = await annotationService.createAnnotation(caseId, {
          messageId,
          fileUrl,
          pageNumber: lastAction.annotation.pageNumber,
          type: lastAction.annotation.type,
          coordinates: lastAction.annotation.coordinates,
          style: lastAction.annotation.style,
          text: lastAction.annotation.text,
        });
        setAnnotations((prev) => [...prev, recreated]);
        setRedoStack((prev) => [
          ...prev,
          { type: "delete", annotation: recreated },
        ]);
        if (socket) {
          socket.emit("annotation:create", { caseId, annotation: recreated });
        }
      } else if (lastAction.type === "update") {
        const reverted = await annotationService.updateAnnotation(
          caseId,
          lastAction.previous._id,
          {
            text: lastAction.previous.text,
            style: lastAction.previous.style,
          }
        );
        setAnnotations((prev) =>
          prev.map((a) => (a._id === reverted._id ? reverted : a))
        );
        setRedoStack((prev) => [...prev, lastAction]);
        if (socket) {
          socket.emit("annotation:update", {
            caseId,
            annotation: reverted,
            fileUrl,
          });
        }
      }
      triggerSavedFeedback();
    } catch (err) {
      console.error("Undo failed:", err);
      setSaveStatus("saved");
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const nextAction = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));

    try {
      setSaveStatus("saving");
      if (nextAction.type === "add") {
        const recreated = await annotationService.createAnnotation(caseId, {
          messageId,
          fileUrl,
          pageNumber: nextAction.annotation.pageNumber,
          type: nextAction.annotation.type,
          coordinates: nextAction.annotation.coordinates,
          style: nextAction.annotation.style,
          text: nextAction.annotation.text,
        });
        setAnnotations((prev) => [...prev, recreated]);
        setUndoStack((prev) => [...prev, { type: "add", annotation: recreated }]);
        if (socket) {
          socket.emit("annotation:create", { caseId, annotation: recreated });
        }
      } else if (nextAction.type === "delete") {
        await annotationService.deleteAnnotation(caseId, nextAction.annotation._id);
        setAnnotations((prev) => prev.filter((a) => a._id !== nextAction.annotation._id));
        setUndoStack((prev) => [...prev, nextAction]);
        if (socket) {
          socket.emit("annotation:delete", {
            caseId,
            annotationId: nextAction.annotation._id,
            fileUrl,
          });
        }
      } else if (nextAction.type === "update") {
        const updated = await annotationService.updateAnnotation(
          caseId,
          nextAction.current._id,
          {
            text: nextAction.current.text,
            style: nextAction.current.style,
          }
        );
        setAnnotations((prev) =>
          prev.map((a) => (a._id === updated._id ? updated : a))
        );
        setUndoStack((prev) => [...prev, nextAction]);
        if (socket) {
          socket.emit("annotation:update", {
            caseId,
            annotation: updated,
            fileUrl,
          });
        }
      }
      triggerSavedFeedback();
    } catch (err) {
      console.error("Redo failed:", err);
      setSaveStatus("saved");
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      const isMac = navigator.platform?.toUpperCase().includes("MAC") ?? false;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          void handleRedo();
        } else {
          void handleUndo();
        }
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        void handleRedo();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedAnnotationId) {
          setSelectedAnnotationId(null);
        } else if (activeTool !== "select") {
          setActiveTool("select");
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotationId) {
          e.preventDefault();
          void handleDeleteAnnotation(selectedAnnotationId);
        }
        return;
      }

      if (e.key.toLowerCase() === "v") {
        setActiveTool("select");
      } else if (e.key.toLowerCase() === "p") {
        setActiveTool("pen");
      } else if (e.key.toLowerCase() === "h") {
        setActiveTool("highlighter");
      } else if (e.key.toLowerCase() === "t") {
        setActiveTool("text");
      } else if (e.key.toLowerCase() === "r" && !e.shiftKey) {
        setActiveTool("rectangle");
      } else if (e.key.toLowerCase() === "a") {
        setActiveTool("arrow");
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      } else if (e.key === "[" || e.key === "PageUp") {
        if (isPdf && currentPage > 1) handlePageChange(currentPage - 1);
      } else if (e.key === "]" || e.key === "PageDown") {
        if (isPdf && currentPage < (numPages || 1)) handlePageChange(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    selectedAnnotationId,
    activeTool,
    isPdf,
    currentPage,
    numPages,
    undoStack,
    redoStack,
    onClose,
  ]);

  // Download File with original URL
  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch {
      window.open(fileUrl, "_blank");
    }
  };

  if (!isOpen) return null;

  const currentDimensions = { width: imageDimensions.width, height: imageDimensions.height };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl select-none"
    >
      {/* Top Document Header */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        {/* Left: Back + File identity */}
        <div className="flex items-center space-x-3 truncate">
          <button
            type="button"
            onClick={onClose}
            title="Back to Case (Esc)"
            className="flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Back</span>
          </button>

          <div className="flex items-center space-x-2 truncate">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-100 truncate max-w-sm sm:max-w-md">
              {fileName}
            </span>
            <span className="text-slate-500 hidden md:inline">·</span>
            <span className="text-slate-400 text-[11px] hidden md:inline truncate">
              {senderName ? `Shared by ${senderName}` : "Document Workspace"}
              {isPdf ? " · PDF" : ""}
            </span>
          </div>
        </div>

        {/* Right: Live Save Status indicator */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1.5 font-medium text-[11px]">
            {saveStatus === "saving" ? (
              <span className="flex items-center space-x-1.5 text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : saveStatus === "just-saved" ? (
              <span className="flex items-center space-x-1.5 text-emerald-400 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ Saved just now</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                <span>✓ Saved</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Markup Toolbar */}
      <MarkupToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        color={color}
        onChangeColor={setColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        rotation={rotation}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={handlePageChange}
        onDownload={handleDownload}
        onClose={onClose}
        showNotesSidebar={showNotesSidebar}
        onToggleNotesSidebar={() => setShowNotesSidebar((prev) => !prev)}
        showAiSidebar={showAiSidebar}
        onToggleAiSidebar={() => setShowAiSidebar((prev) => !prev)}
        annotationCount={annotations.length}
        isPdf={isPdf}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Display Canvas Area */}
        <div
          ref={documentViewportRef}
          className={`flex-1 overflow-auto bg-slate-900/60 ${isPdf ? "" : "flex items-center justify-center p-6"}`}
        >
          {!isPdf && (
            <div
              className="relative shadow-2xl rounded-lg bg-white transition-transform duration-150"
              style={{
                transform: `rotate(${rotation}deg)`,
                width: currentDimensions.width,
                height: currentDimensions.height,
              }}
            >
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
                  Loading image...
                </div>
              )}
              <img
                src={fileUrl}
                alt={fileName}
                onLoad={handleImageLoad}
                className="w-full h-full object-contain block select-none"
              />
            </div>
          )}

          {isPdf && (
            <>
              {pdfError ? (
                <div className="m-6 rounded-lg bg-slate-100 p-8 text-center text-slate-700">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                  <p className="mb-2 text-sm font-semibold">{pdfError}</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-indigo-600 underline"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              ) : isPdfLoading || !pdfDocument ? (
                <div className="grid min-h-full place-items-center text-sm text-slate-400">
                  Loading PDF...
                </div>
              ) : (
                <PdfDocument
                  pdfDocument={pdfDocument}
                  numPages={numPages}
                  zoom={zoom}
                  rotation={rotation}
                  activeTool={activeTool}
                  color={color}
                  strokeWidth={strokeWidth}
                  annotations={annotations}
                  selectedAnnotationId={selectedAnnotationId}
                  viewportRef={documentViewportRef}
                  onAddAnnotation={handleAddAnnotation}
                  onSelectAnnotation={(ann) => setSelectedAnnotationId(ann._id)}
                  onVisiblePageChange={handleVisiblePageChange}
                  onPageRef={handlePageRef}
                />
              )}
            </>
          )}
        </div>

        {/* Dedicated Ask AI Sidebar Drawer */}
        {showAiSidebar && (
          <div className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col h-full z-40 text-slate-100 shadow-2xl animate-in slide-in-from-right-5 duration-200">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Ask AI Assistant</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSidebar(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentQAPanel
                caseId={caseId}
                messageId={messageId}
                onJumpToPage={handlePageChange}
                onClose={() => setShowAiSidebar(false)}
              />
            </div>
          </div>
        )}

        {/* Collapsible Notes & Markup Sidebar */}
        {showNotesSidebar && (
          <div className="w-88 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col h-full z-40 text-slate-100 shadow-2xl animate-in slide-in-from-right-5 duration-200">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">Notes & Annotations</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {annotations.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotesSidebar(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedAnnotation && (
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                    Selected {selectedAnnotation.type}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => void handleDeleteAnnotation(selectedAnnotation._id)}
                      title="Delete annotation"
                      className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAnnotationId(null)}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                <label className="block text-xs text-slate-400 space-y-1">
                  <span>Note text</span>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-slate-400 space-y-1">
                    <span>Color</span>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 p-1 cursor-pointer"
                    />
                  </label>

                  <label className="block text-xs text-slate-400 space-y-1">
                    <span>Stroke ({editStrokeWidth}px)</span>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={editStrokeWidth}
                      onChange={(e) => setEditStrokeWidth(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveSelectedAnnotation()}
                  disabled={isSavingEdit}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-sm"
                >
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {annotations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs px-4">
                  No annotations added yet. Pick a tool from the toolbar (P for Pen, H for Highlighter, T for Text) to mark up the document.
                </div>
              ) : (
                annotations.map((ann) => {
                  const creatorName =
                    typeof ann.createdBy === "object"
                      ? ann.createdBy.name || "User"
                      : "User";
                  const isOwner =
                    typeof ann.createdBy === "object"
                      ? ann.createdBy._id === user?._id
                      : ann.createdBy === user?._id;

                  return (
                    <div
                      key={ann._id}
                      onClick={() => {
                        setSelectedAnnotationId(ann._id);
                        if (ann.pageNumber) handlePageChange(ann.pageNumber);
                      }}
                      className={`p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                        selectedAnnotationId === ann._id
                          ? "border-indigo-500 bg-indigo-950/50 shadow-sm"
                          : "border-slate-800 bg-slate-800/40 hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: ann.style?.color || "#ef4444" }}
                          />
                          <span className="font-medium text-slate-200 capitalize">
                            {ann.type} {isPdf ? `(Page ${ann.pageNumber})` : ""}
                          </span>
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteAnnotation(ann._id);
                            }}
                            title="Delete annotation"
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {ann.text && (
                        <p className="text-slate-300 font-medium mb-1 bg-slate-950/60 p-2 rounded border border-slate-800">
                          "{ann.text}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center space-x-1">
                          <UserIcon className="w-3 h-3 text-slate-500" />
                          <span>{creatorName}</span>
                        </span>
                        <span>
                          {new Date(ann.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Clear All Footer */}
            {annotations.length > 0 && (
              <div className="p-3 border-t border-slate-800 bg-slate-950">
                {confirmClearAll ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-300 font-medium text-center">
                      Clear all {annotations.length} annotations?
                    </p>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => void handleClearAllAnnotations()}
                        className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold"
                      >
                        Yes, Clear All
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded border border-red-900/40 transition-colors"
                  >
                    Clear All Annotations
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
