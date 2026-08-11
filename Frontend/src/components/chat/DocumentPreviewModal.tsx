import { useState, useEffect, useRef, useEffectEvent, type FC } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Trash2,
  User as UserIcon,
  AlertCircle,
  X,
  Sparkles,
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
    fileMimeType?.includes("pdf") ||
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
  const [showNotesSidebar, setShowNotesSidebar] = useState(false);
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const documentViewportRef = useRef<HTMLDivElement | null>(null);

  const { pdfDocument, numPages, isLoading: isPdfLoading, error: pdfError } =
    usePdfDocument(isPdf ? fileUrl : undefined);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  // Image size state for non-PDF image documents
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
  const [isImageLoading, setIsImageLoading] = useState(!isPdf);

  // Fetch initial annotations
  useEffect(() => {
    if (!isOpen || !caseId || !fileUrl) return;

    let isMounted = true;
    annotationService
      .getAnnotations(caseId, fileUrl, messageId)
      .then((data) => {
        if (isMounted) setAnnotations(data);
      })
      .catch((err) => {
        console.error("Failed to load annotations:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, caseId, fileUrl, messageId]);

  // Real-time socket listeners for live markup sync
  useEffect(() => {
    if (!socket || !caseId) return;

    const handleCreated = ({ caseId: cId, annotation }: { caseId: string; annotation: Annotation }) => {
      if (cId === caseId && annotation.fileUrl === fileUrl) {
        setAnnotations((prev) => [...prev.filter((a) => a._id !== annotation._id), annotation]);
      }
    };

    const handleUpdated = ({ caseId: cId, annotation }: { caseId: string; annotation: Annotation }) => {
      if (cId === caseId && annotation.fileUrl === fileUrl) {
        setAnnotations((prev) => prev.map((a) => (a._id === annotation._id ? annotation : a)));
      }
    };

    const handleDeleted = ({ caseId: cId, annotationId }: { caseId: string; annotationId: string }) => {
      if (cId === caseId) {
        setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
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
  }, [socket, caseId, fileUrl]);

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
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);
  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);

  const handlePageChange = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, numPages || 1));
    setCurrentPage(nextPage);
    pageRefs.current.get(nextPage)?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      // Emit socket event for co-workers
      if (socket) {
        socket.emit("annotation:create", { caseId, annotation: created });
      }
    } catch (err) {
      console.error("Failed to add annotation:", err);
    }
  };

  // Delete Annotation
  const handleDeleteAnnotation = async (annId: string) => {
    try {
      await annotationService.deleteAnnotation(caseId, annId);
      setAnnotations((prev) => prev.filter((a) => a._id !== annId));

      if (socket) {
        socket.emit("annotation:delete", { caseId, annotationId: annId, fileUrl });
      }
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  };

  const handleSaveSelectedAnnotation = async () => {
    if (!selectedAnnotation) return;

    try {
      setIsSavingEdit(true);
      const updated = await annotationService.updateAnnotation(caseId, selectedAnnotation._id, {
        text: editText,
        style: {
          color: editColor,
          strokeWidth: editStrokeWidth,
        },
      });

      setAnnotations((prev) => prev.map((ann) => (ann._id === updated._id ? updated : ann)));

      if (socket) {
        socket.emit("annotation:update", { caseId, annotation: updated, fileUrl });
      }
    } catch (err) {
      console.error("Failed to update annotation:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

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
    } catch (error) {
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
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl select-none"
    >
      {/* Top Header / Toolbar */}
      {senderName && (
        <div className="bg-slate-900 px-4 py-1 text-[11px] text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
          <span>Shared by: <strong className="text-slate-200">{senderName}</strong></span>
          <span className="truncate max-w-xs text-slate-400">{fileName}</span>
        </div>
      )}
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
        rotation={rotation}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={handlePageChange}
        onClearAnnotations={() => setAnnotations([])}
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
          className={`flex-1 overflow-auto bg-slate-900/50 ${isPdf ? "" : "flex items-center justify-center p-6"}`}
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
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 underline">
                    Open PDF in new tab
                  </a>
                </div>
              ) : isPdfLoading || !pdfDocument ? (
                <div className="grid min-h-full place-items-center text-sm text-slate-400">Loading PDF...</div>
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
          <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col h-full z-40 text-slate-100 animate-in slide-in-from-right-5 duration-200">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Ask AI Assistant</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSidebar(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentQAPanel caseId={caseId} messageId={messageId} onClose={() => setShowAiSidebar(false)} />
            </div>
          </div>
        )}

        {/* Collapsible Notes & Markup Sidebar */}
        {showNotesSidebar && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full z-40 text-slate-100">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">Notes & Annotations</h3>
              </div>
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                {annotations.length}
              </span>
            </div>

            {selectedAnnotation && (
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Edit annotation
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedAnnotationId(null)}
                    className="text-xs text-slate-500 hover:text-slate-200"
                  >
                    Clear
                  </button>
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
                      className="h-10 w-full rounded-md bg-slate-900 border border-slate-700 p-1"
                    />
                  </label>

                  <label className="block text-xs text-slate-400 space-y-1">
                    <span>Stroke</span>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={editStrokeWidth}
                      onChange={(e) => setEditStrokeWidth(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveSelectedAnnotation()}
                  disabled={isSavingEdit}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {annotations.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No annotations added yet. Pick a tool from the toolbar to mark up document.
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
                          ? "border-indigo-500 bg-indigo-950/40"
                          : "border-slate-800 bg-slate-800/50 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: ann.style?.color || "#ef4444" }}
                          />
                          <span className="font-medium text-slate-200 capitalize">
                            {ann.type} {isPdf ? `(Pg ${ann.pageNumber})` : ""}
                          </span>
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(ann._id);
                            }}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {ann.text && (
                        <p className="text-slate-300 font-medium mb-1 bg-slate-900/60 p-1.5 rounded">
                          "{ann.text}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center space-x-1">
                          <UserIcon className="w-3 h-3 text-slate-500" />
                          <span>{creatorName}</span>
                        </span>
                        <span>{new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
