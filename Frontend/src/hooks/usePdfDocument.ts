import { useEffect, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface UsePdfDocumentResult {
  pdfDocument: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  error: string | null;
}

export const usePdfDocument = (pdfUrl?: string): UsePdfDocumentResult => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(pdfUrl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setPdfDocument(null);
      setNumPages(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCurrent = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    let loadingTask: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | null = null;

    setPdfDocument(null);
    setNumPages(0);
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        loadedDocument = await loadingTask.promise;

        if (!isCurrent) return;
        setPdfDocument(loadedDocument);
        setNumPages(loadedDocument.numPages);
      } catch (caught) {
        if (!isCurrent) return;
        console.warn("PDF.js document load failed:", caught);
        setError(caught instanceof Error ? caught.message : "PDF could not be loaded.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isCurrent = false;
      if (loadedDocument) {
        void loadedDocument.destroy().catch(() => undefined);
      } else {
        void loadingTask?.destroy().catch(() => undefined);
      }
    };
  }, [pdfUrl]);

  return { pdfDocument, numPages, isLoading, error };
};
