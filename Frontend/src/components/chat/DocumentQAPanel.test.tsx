import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentQAPanel } from "./DocumentQAPanel";
import aiService from "../../services/aiService";

vi.mock("../../services/aiService", () => ({
  default: {
    askDocument: vi.fn(),
  },
}));

describe("DocumentQAPanel", () => {
  const defaultProps = {
    caseId: "case-123",
    messageId: "msg-456",
    onJumpToPage: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders quick actions and sample prompts in empty state", () => {
    render(<DocumentQAPanel {...defaultProps} />);

    expect(screen.getByText("Ask for Summary")).toBeInTheDocument();
    expect(screen.getByText("Extract Action Items")).toBeInTheDocument();
    expect(screen.getByText("Try asking:")).toBeInTheDocument();
    expect(
      screen.getByText('"What are the key skills and qualifications?"')
    ).toBeInTheDocument();
  });

  it("submits summary query on 'Ask for Summary' click", async () => {
    vi.mocked(aiService.askDocument).mockResolvedValueOnce({
      answer: "This is a comprehensive summary of the document.",
      citations: [
        {
          sourceType: "document",
          sourceId: "doc-1",
          caseId: "case-123",
          label: "Page 1 - Experience section",
          pageNumber: 1,
          relevance: 0.95,
        },
      ],
      confidence: 0.92,
      conversationId: "conv-1",
    });

    render(<DocumentQAPanel {...defaultProps} />);

    const summaryBtn = screen.getByText("Ask for Summary");
    fireEvent.click(summaryBtn);

    expect(aiService.askDocument).toHaveBeenCalledWith(
      "case-123",
      "msg-456",
      expect.stringContaining("Summarize this document")
    );

    await waitFor(() => {
      expect(
        screen.getByText("This is a comprehensive summary of the document.")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("92% Confidence")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 - Experience section/)).toBeInTheDocument();
  });

  it("calls onJumpToPage when citation jump button is clicked", async () => {
    vi.mocked(aiService.askDocument).mockResolvedValueOnce({
      answer: "Internship dates are February 2026 to July 2026.",
      citations: [
        {
          sourceType: "document",
          sourceId: "doc-1",
          caseId: "case-123",
          label: "Page 2 - Work History",
          pageNumber: 2,
          relevance: 0.98,
        },
      ],
      confidence: 0.95,
      conversationId: "conv-2",
    });

    render(<DocumentQAPanel {...defaultProps} />);

    const promptChip = screen.getByText(
      '"When did the latest role or internship start?"'
    );
    fireEvent.click(promptChip);

    await waitFor(() => {
      expect(
        screen.getByText("Internship dates are February 2026 to July 2026.")
      ).toBeInTheDocument();
    });

    const jumpBtn = screen.getByTitle("Jump to Page 2");
    fireEvent.click(jumpBtn);

    expect(defaultProps.onJumpToPage).toHaveBeenCalledWith(2);
  });
});
