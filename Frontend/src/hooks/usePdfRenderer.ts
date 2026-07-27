import { useState, useEffect, useRef } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface UsePdfRendererProps {
  pdfUrl?: string;
  pageNumber: number;
  zoom: number;
  rotation: number;
}

interface UsePdfRendererResult {
  numPages: number;
  isLoading: boolean;
  error: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimensions: { width: number; height: number };
}

export const usePdfRenderer = ({
  pdfUrl,
  pageNumber,
  zoom,
  rotation,
}: UsePdfRendererProps): UsePdfRendererResult => {
  const [numPages, setNumPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1100,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    let loadingTask: { promise: Promise<any>; destroy: () => Promise<void> } | null = null;
    setIsLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
        });
        const pdf = await loadingTask.promise;

        if (!isSubscribed) return;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(Math.max(1, Math.min(pageNumber, pdf.numPages)));
        const viewport = page.getViewport({ scale: zoom, rotation });
        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("PDF canvas is not ready");
        }

        renderTaskRef.current?.cancel();
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("PDF canvas context is unavailable");
        }
        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (!isSubscribed) return;
        console.warn("PDF.js render failed:", err);
        setError(err?.message || "PDF could not be rendered.");
        setDimensions({ width: 800 * zoom, height: 1100 * zoom });
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      isSubscribed = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      void loadingTask?.destroy().catch(() => undefined);
    };
  }, [pdfUrl, pageNumber, zoom, rotation]);

  return {
    numPages,
    isLoading,
    error,
    canvasRef,
    dimensions,
  };
};
