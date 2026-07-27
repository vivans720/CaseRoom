import {
  useEffect,
  useRef,
  useState,
  type FC,
  type RefObject,
} from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { Annotation, AnnotationTool } from "../../types";
import { AnnotationCanvas } from "./AnnotationCanvas";

interface PdfDocumentProps {
  pdfDocument: PDFDocumentProxy;
  numPages: number;
  zoom: number;
  rotation: number;
  activeTool: AnnotationTool;
  color: string;
  strokeWidth: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  onAddAnnotation: (annotation: Omit<Annotation, "_id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  onVisiblePageChange: (pageNumber: number) => void;
  onPageRef: (pageNumber: number, element: HTMLDivElement | null) => void;
}

interface PdfPageProps extends Omit<PdfDocumentProps, "numPages" | "onPageRef"> {
  pageNumber: number;
  onPageRef: PdfDocumentProps["onPageRef"];
}

const PdfPage: FC<PdfPageProps> = ({
  pdfDocument,
  pageNumber,
  zoom,
  rotation,
  activeTool,
  color,
  strokeWidth,
  annotations,
  selectedAnnotationId,
  viewportRef,
  onAddAnnotation,
  onSelectAnnotation,
  onVisiblePageChange,
  onPageRef,
}) => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 1100 });
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) onVisiblePageChange(pageNumber);
      },
      { root: viewportRef.current, threshold: 0.55 }
    );

    observer.observe(pageElement);
    return () => observer.disconnect();
  }, [onVisiblePageChange, pageNumber, viewportRef]);

  useEffect(() => {
    let isCurrent = true;
    setIsRendering(true);
    setRenderError(null);

    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom, rotation });
        const canvas = canvasRef.current;
        if (!canvas || !isCurrent) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        setDimensions({ width: viewport.width, height: viewport.height });

        const context = canvas.getContext("2d");
        if (!context) throw new Error("PDF canvas context is unavailable");

        renderTaskRef.current?.cancel();
        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (caught) {
        if (!isCurrent || (caught instanceof Error && caught.name === "RenderingCancelledException")) return;
        console.warn(`PDF.js page ${pageNumber} render failed:`, caught);
        setRenderError(caught instanceof Error ? caught.message : "Page could not be rendered.");
      } finally {
        if (isCurrent) setIsRendering(false);
      }
    };

    void render();
    return () => {
      isCurrent = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pdfDocument, pageNumber, rotation, zoom]);

  return (
    <div
      ref={(element) => {
        pageRef.current = element;
        onPageRef(pageNumber, element);
      }}
      className="relative shrink-0 bg-white shadow-2xl"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas ref={canvasRef} className="block" />
      {isRendering && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm text-slate-500">
          Rendering page {pageNumber}...
        </div>
      )}
      {renderError && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-600">
          {renderError}
        </div>
      )}
      {!isRendering && !renderError && (
        <AnnotationCanvas
          width={dimensions.width}
          height={dimensions.height}
          pageNumber={pageNumber}
          activeTool={activeTool}
          color={color}
          strokeWidth={strokeWidth}
          annotations={annotations}
          onAddAnnotation={onAddAnnotation}
          onSelectAnnotation={onSelectAnnotation}
          selectedAnnotationId={selectedAnnotationId}
        />
      )}
    </div>
  );
};

export const PdfDocument: FC<PdfDocumentProps> = ({ numPages, ...props }) => (
  <div className="flex min-h-full flex-col items-center gap-6 py-6">
    {Array.from({ length: numPages }, (_, index) => (
      <PdfPage key={index + 1} pageNumber={index + 1} {...props} />
    ))}
  </div>
);
