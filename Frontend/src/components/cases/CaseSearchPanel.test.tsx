import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { CaseSearchPanel } from "./CaseSearchPanel";
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

describe("CaseSearchPanel", () => {
  const mockCases = [{ _id: "1", title: "Search Result Case" }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (useCases as Mock).mockReturnValue({
      unreadCounts: {},
      pinCase: vi.fn(),
      unpinCase: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input and filters", () => {
    render(<CaseSearchPanel />);
    expect(screen.getByPlaceholderText(/search by title/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Statuses")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Newest")).toBeInTheDocument();
  });

  it("performs search after debounce when user types", async () => {
    (caseService.searchCases as Mock).mockResolvedValue(mockCases);
    render(<CaseSearchPanel />);

    const input = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(input, { target: { value: "result" } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Flush microtasks and wait for re-render
    await waitFor(() =>
      expect(screen.getByText("Search Result Case")).toBeInTheDocument(),
    );

    expect(caseService.searchCases).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "result",
      }),
    );
  });

  it("filters by status", async () => {
    (caseService.searchCases as Mock).mockResolvedValue(mockCases);
    render(<CaseSearchPanel />);

    const select = screen.getByDisplayValue("All Statuses");
    fireEvent.change(select, { target: { value: "active" } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    await waitFor(() =>
      expect(caseService.searchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "active",
        }),
      ),
    );
  });

  it("displays empty state when no results match", async () => {
    (caseService.searchCases as Mock).mockResolvedValue([]);
    render(<CaseSearchPanel />);

    const input = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(input, { target: { value: "nothing" } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    await waitFor(() =>
      expect(screen.getByText(/no cases found/i)).toBeInTheDocument(),
    );
  });
});
