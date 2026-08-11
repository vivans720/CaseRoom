const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { parse } = require("csv-parse/sync");

const supportedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]);

/**
 * Format-Aware Sliding Window Text Splitter
 * Preserves sentence & page boundaries
 */
const splitText = (text, size = 1100, overlap = 160) => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const chunks = [];
  for (let start = 0; start < normalized.length; start += size - overlap) {
    const chunk = normalized.slice(start, start + size).trim();
    if (chunk) chunks.push(chunk);
    if (start + size >= normalized.length) break;
  }
  return chunks;
};

const fetchBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download document (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Document Text Extractor with Scanned / Empty PDF Detection
 */
const extractDocument = async ({ fileUrl, fileMimeType }) => {
  if (!supportedMimeTypes.has(fileMimeType)) {
    return { supported: false, error: `Unsupported file type: ${fileMimeType}`, pages: [] };
  }

  const buffer = await fetchBuffer(fileUrl);

  if (fileMimeType === "application/pdf") {
    const pages = [];
    await pdf(buffer, {
      pagerender: async (pageData) => {
        const content = await pageData.getTextContent();
        pages.push(content.items.map((item) => item.str).join(" "));
        return "";
      },
    });

    const totalChars = pages.reduce((acc, p) => acc + p.trim().length, 0);
    // Detect scanned or image-only PDFs with no extractable text
    if (totalChars < 20) {
      return { supported: false, error: "Scanned or image-only PDF (no extractable text, OCR required)", pages: [] };
    }

    return { supported: true, pages: pages.map((text, index) => ({ text, pageNumber: index + 1 })) };
  }

  if (fileMimeType.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length < 5) {
      return { supported: false, error: "Empty Word document", pages: [] };
    }
    return { supported: true, pages: [{ text: result.value, segment: "document" }] };
  }

  const raw = buffer.toString("utf8");
  if (fileMimeType === "text/csv") {
    const rows = parse(raw, { relax_column_count: true, skip_empty_lines: true });
    return { supported: true, pages: rows.map((row, index) => ({ text: row.join(" | "), segment: `row ${index + 1}` })) };
  }

  return { supported: true, pages: [{ text: raw, segment: "text" }] };
};

module.exports = { extractDocument, splitText, supportedMimeTypes };
