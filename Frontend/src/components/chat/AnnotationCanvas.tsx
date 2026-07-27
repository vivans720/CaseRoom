import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FC,
  type PointerEvent,
} from "react";
import type { Annotation, AnnotationTool } from "../../types";

interface AnnotationCanvasProps {
  width: number;
  height: number;
  pageNumber: number;
  activeTool: AnnotationTool;
  color: string;
  strokeWidth: number;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, "_id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  onSelectAnnotation?: (annotation: Annotation) => void;
  selectedAnnotationId?: string | null;
}

const isAnnotationHit = (
  annotation: Annotation,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const coordinates = annotation.coordinates || {};
  const points = coordinates.points || [];
  const tolerance = 12 / Math.max(1, Math.min(width, height));

  if (points.length > 0) {
    return points.some((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const lengthSquared = dx * dx + dy * dy;
      const progress = lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - previous.x) * dx + (y - previous.y) * dy) / lengthSquared));
      const closestX = previous.x + progress * dx;
      const closestY = previous.y + progress * dy;
      return Math.hypot(x - closestX, y - closestY) <= tolerance;
    });
  }

  const annotationX = coordinates.x || 0;
  const annotationY = coordinates.y || 0;
  const annotationWidth = coordinates.width ||
    (annotation.type === "text" ? Math.max(0.08, (annotation.text?.length || 4) * 0.018) : 0.04);
  const annotationHeight = coordinates.height || (annotation.type === "text" ? 0.04 : 0.04);

  return (
    x >= annotationX - tolerance &&
    x <= annotationX + annotationWidth + tolerance &&
    y >= annotationY - tolerance &&
    y <= annotationY + annotationHeight + tolerance
  );
};

export const AnnotationCanvas: FC<AnnotationCanvasProps> = ({
  width,
  height,
  pageNumber,
  activeTool,
  color,
  strokeWidth,
  annotations,
  onAddAnnotation,
  onSelectAnnotation,
  selectedAnnotationId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number; normX: number; normY: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  // Helper to normalize canvas coordinates to 0..1 ratio
  const getCanvasCoords = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, normX: 0, normY: 0 };

      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const normX = Math.max(0, Math.min(1, x / rect.width));
      const normY = Math.max(0, Math.min(1, y / rect.height));

      return { x, y, normX, normY };
    },
    []
  );

  // Redraw canvas content whenever annotations, width, height, or active drawing state changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Filter annotations for current page
    const pageAnnotations = annotations.filter((a) => (a.pageNumber || 1) === pageNumber);

    pageAnnotations.forEach((ann) => {
      const isSelected = ann._id === selectedAnnotationId;
      ctx.save();

      ctx.strokeStyle = ann.style?.color || "#ef4444";
      ctx.fillStyle = ann.style?.color || "#ef4444";
      ctx.lineWidth = (ann.style?.strokeWidth || 3) * (width / 800); // Scale line width proportionally
      ctx.globalAlpha = ann.type === "highlighter" ? 0.4 : ann.style?.opacity || 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (isSelected) {
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 10;
      }

      if (ann.type === "pen" || ann.type === "highlighter") {
        if (ann.coordinates?.points && ann.coordinates.points.length > 0) {
          ctx.beginPath();
          ann.coordinates.points.forEach((pt, i) => {
            const px = pt.x * width;
            const py = pt.y * height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
      } else if (ann.type === "rectangle") {
        const x = (ann.coordinates?.x || 0) * width;
        const y = (ann.coordinates?.y || 0) * height;
        const w = (ann.coordinates?.width || 0) * width;
        const h = (ann.coordinates?.height || 0) * height;

        ctx.strokeRect(x, y, w, h);
      } else if (ann.type === "arrow") {
        if (ann.coordinates?.points && ann.coordinates.points.length >= 2) {
          const p1 = ann.coordinates.points[0];
          const p2 = ann.coordinates.points[1];
          const x1 = p1.x * width;
          const y1 = p1.y * height;
          const x2 = p2.x * width;
          const y2 = p2.y * height;

          // Draw main shaft
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Draw arrowhead
          const headlen = 12;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headlen * Math.cos(angle - Math.PI / 6),
            y2 - headlen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x2 - headlen * Math.cos(angle + Math.PI / 6),
            y2 - headlen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      } else if (ann.type === "text") {
        const x = (ann.coordinates?.x || 0) * width;
        const y = (ann.coordinates?.y || 0) * height;
        const fontSize = (ann.style?.fontSize || 14) * (width / 800);

        ctx.font = `bold ${Math.max(12, fontSize)}px sans-serif`;
        ctx.globalAlpha = 1;

        // Background tag pill
        const padding = 6;
        const textMetrics = ctx.measureText(ann.text || "Note");
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = fontSize + padding * 1.5;

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(x, y - bgHeight / 1.5, bgWidth, bgHeight, 6);
        ctx.fill();
        ctx.strokeStyle = ann.style?.color || "#6366f1";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(ann.text || "Note", x + padding, y + fontSize / 3);
      }

      ctx.restore();
    });

    // Draw active dynamic preview shape if drawing in progress
    if (isDrawing && startPos) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth * (width / 800);
      ctx.globalAlpha = activeTool === "highlighter" ? 0.4 : 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if ((activeTool === "pen" || activeTool === "highlighter") && currentPoints.length > 0) {
        ctx.beginPath();
        currentPoints.forEach((pt, i) => {
          const px = pt.x * width;
          const py = pt.y * height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (activeTool === "rectangle" && currentPoints.length > 0) {
        const lastPt = currentPoints[currentPoints.length - 1];
        const x = startPos.x * width;
        const y = startPos.y * height;
        const w = (lastPt.x - startPos.x) * width;
        const h = (lastPt.y - startPos.y) * height;
        ctx.strokeRect(x, y, w, h);
      } else if (activeTool === "arrow" && currentPoints.length > 0) {
        const lastPt = currentPoints[currentPoints.length - 1];
        const x1 = startPos.x * width;
        const y1 = startPos.y * height;
        const x2 = lastPt.x * width;
        const y2 = lastPt.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [width, height, pageNumber, annotations, selectedAnnotationId, isDrawing, startPos, color, strokeWidth, activeTool, currentPoints]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer Event Handlers
  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);

    if (activeTool === "select") {
      // Find clicked annotation
      const pageAnns = annotations.filter((a) => (a.pageNumber || 1) === pageNumber);
      const clicked = pageAnns.find((ann) =>
        isAnnotationHit(ann, coords.normX, coords.normY, width, height)
      );

      if (clicked && onSelectAnnotation) {
        onSelectAnnotation(clicked);
      }
      return;
    }

    if (activeTool === "text") {
      setTextInputPos({
        x: coords.x,
        y: coords.y,
        normX: coords.normX,
        normY: coords.normY,
      });
      setTextInputValue("");
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setStartPos({ x: coords.normX, y: coords.normY });
    setCurrentPoints([{ x: coords.normX, y: coords.normY }]);
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentPoints((prev) => [...prev, { x: coords.normX, y: coords.normY }]);
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    const coords = getCanvasCoords(e);
    const finalPoints = [
      ...currentPoints,
      { x: coords.normX, y: coords.normY },
    ];

    if (activeTool === "pen" || activeTool === "highlighter") {
      if (finalPoints.length > 1) {
        onAddAnnotation({
          caseId: "",
          fileUrl: "",
          pageNumber,
          type: activeTool,
          coordinates: { points: finalPoints },
          style: {
            color,
            strokeWidth,
            opacity: activeTool === "highlighter" ? 0.4 : 1,
          },
        });
      }
    } else if (activeTool === "rectangle") {
      const w = coords.normX - startPos.x;
      const h = coords.normY - startPos.y;
      if (Math.abs(w) > 0.01 && Math.abs(h) > 0.01) {
        onAddAnnotation({
          caseId: "",
          fileUrl: "",
          pageNumber,
          type: "rectangle",
          coordinates: {
            x: Math.min(startPos.x, coords.normX),
            y: Math.min(startPos.y, coords.normY),
            width: Math.abs(w),
            height: Math.abs(h),
          },
          style: { color, strokeWidth, opacity: 1 },
        });
      }
    } else if (activeTool === "arrow") {
      onAddAnnotation({
        caseId: "",
        fileUrl: "",
        pageNumber,
        type: "arrow",
        coordinates: {
          points: [
            { x: startPos.x, y: startPos.y },
            { x: coords.normX, y: coords.normY },
          ],
        },
        style: { color, strokeWidth, opacity: 1 },
      });
    }

    setCurrentPoints([]);
    setStartPos(null);
  };

  const handlePointerCancel = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPos(null);
  };

  const handleSaveTextAnnotation = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      return;
    }

    onAddAnnotation({
      caseId: "",
      fileUrl: "",
      pageNumber,
      type: "text",
      coordinates: {
        x: textInputPos.normX,
        y: textInputPos.normY,
      },
      style: { color, strokeWidth, opacity: 1, fontSize: 14 },
      text: textInputValue.trim(),
    });

    setTextInputPos(null);
    setTextInputValue("");
  };

  return (
    <div className="absolute inset-0 z-20" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`absolute inset-0 h-full w-full touch-none ${
          activeTool === "select"
            ? "cursor-default"
            : activeTool === "text"
            ? "cursor-text"
            : "cursor-crosshair"
        }`}
      />

      {/* Inline Text Input Overlay */}
      {textInputPos && (
        <div
          style={{ left: textInputPos.x, top: textInputPos.y }}
          className="absolute z-30 transform -translate-y-1/2 bg-slate-900 border border-indigo-500 shadow-xl rounded-lg p-2 flex items-center space-x-2"
        >
          <input
            type="text"
            autoFocus
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTextAnnotation();
              if (e.key === "Escape") setTextInputPos(null);
            }}
            placeholder="Type note or callout..."
            className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded outline-none focus:ring-1 focus:ring-indigo-400 min-w-[180px]"
          />
          <button
            type="button"
            onClick={handleSaveTextAnnotation}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};
