import { useEffect, useState, useRef, useCallback, type MouseEvent, type TouchEvent } from "react";
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, RotateCw as ResetIcon, Download, X } from "lucide-react";
import { createPortal } from "react-dom";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
  senderName?: string;
  sentAt?: string;
}

export const ImagePreviewModal = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  senderName,
  sentAt,
}: ImagePreviewModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const nextZoom = Math.max(z - 0.25, 1);
      if (nextZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => r + 90);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => r - 90);
  }, []);

  const handleDownload = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!imageUrl) return;

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName || "downloaded-image";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error("Image download failed:", error);
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      }
    },
    [imageUrl, fileName]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Reset view on open/close
  useEffect(() => {
    if (isOpen) {
      resetView();
    }
  }, [isOpen, resetView]);

  // Panning/Dragging Logic
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { x: position.x, y: position.y };
  };

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDragging || zoom <= 1) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // Calculate max offset to prevent panning too far
      const maxOffset = (zoom - 1) * 250;
      const newX = Math.min(Math.max(dragOffset.current.x + dx, -maxOffset), maxOffset);
      const newY = Math.min(Math.max(dragOffset.current.y + dy, -maxOffset), maxOffset);
      
      setPosition({ x: newX, y: newY });
    },
    [isDragging, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch event support for mobile
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragOffset.current = { x: position.x, y: position.y };
  };

  const handleTouchMove = useCallback(
    (e: globalThis.TouchEvent) => {
      if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      
      const maxOffset = (zoom - 1) * 250;
      const newX = Math.min(Math.max(dragOffset.current.x + dx, -maxOffset), maxOffset);
      const newY = Math.min(Math.max(dragOffset.current.y + dy, -maxOffset), maxOffset);
      
      setPosition({ x: newX, y: newY });
    },
    [isDragging, zoom]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    // Only close if user clicked directly on the background/backdrop wrapper
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format date correctly
  const formattedTime = sentAt
    ? new Date(sentAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md text-white select-none animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate text-sm sm:text-base">
            {senderName || "Image Preview"}
          </span>
          {formattedTime && (
            <span className="text-xs text-zinc-400 mt-0.5">{formattedTime}</span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-3 bg-black/40 px-2 py-1.5 rounded-full border border-white/5">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            title="Zoom Out"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-mono min-w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            title="Zoom In"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomIn size={18} />
          </button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          <button
            onClick={handleRotateLeft}
            title="Rotate Left"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleRotateRight}
            title="Rotate Right"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <RotateCw size={18} />
          </button>

          <button
            onClick={resetView}
            title="Reset"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <ResetIcon size={18} className="transform scale-x-[-1]" />
          </button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          <button
            onClick={handleDownload}
            title="Download"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-primary-light"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className={`flex-1 flex items-center justify-center p-4 min-h-0 ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleBackdropClick}
      >
        <div className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none">
          <img
            ref={imageRef}
            src={imageUrl}
            alt={fileName || "Preview"}
            onDragStart={(e) => e.preventDefault()}
            className={`max-w-[90vw] max-h-[80vh] object-contain select-none shadow-2xl pointer-events-auto ${
              isDragging ? "transition-none" : "transition-transform duration-200 ease-out"
            }`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
