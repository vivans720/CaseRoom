import { render, screen, waitFor } from "@testing-library/react";
import { AllCasesPanel } from "./AllCasesPanel";
import * as caseService from "../../services/caseService";
import { useCases } from "../../hooks/useCases";
import { vi, Mock } from "vitest";

type CaseListItemProps = {
  caseData: { title: string };
};

vi.mock("../../services/caseService");
vi.mock("../../hooks/useCases");
vi.mock("./CaseListItem", () => ({
  CaseListItem: ({ caseData }: CaseListItemProps) => (
    <div data-testid="case-list-item">{caseData.title}</div>
  ),
}));

describe("AllCasesPanel", () => {
  const mockCases = [
    { _id: "1", title: "Global Case 1" },
    { _id: "2", title: "Global Case 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useCases as Mock).mockReturnValue({
      unreadCounts: {},
      pinCase: vi.fn(),
      unpinCase: vi.fn(),
    });
  });

  it("renders loading spinner initially", () => {
    (caseService.fetchAllCases as Mock).mockReturnValue(new Promise(() => {}));
    render(<AllCasesPanel />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders a list of all cases after loading", async () => {
    (caseService.fetchAllCases as Mock).mockResolvedValue(mockCases);
    render(<AllCasesPanel />);

    await waitFor(() =>
      expect(screen.getAllByTestId("case-list-item")).toHaveLength(2),
    );
    expect(screen.getByText("Global Case 1")).toBeInTheDocument();
    expect(screen.getByText("Global Case 2")).toBeInTheDocument();
  });

  it("renders empty state when no cases exist", async () => {
    (caseService.fetchAllCases as Mock).mockResolvedValue([]);
    render(<AllCasesPanel />);

    await waitFor(() =>
      expect(screen.getByText(/no cases found/i)).toBeInTheDocument(),
    );
  });

  it("renders error state when fetching fails", async () => {
    (caseService.fetchAllCases as Mock).mockRejectedValue(new Error("Fail"));
    render(<AllCasesPanel />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to fetch all cases/i),
      ).toBeInTheDocument(),
    );
  });
});
