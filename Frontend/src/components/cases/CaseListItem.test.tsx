import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { CaseListItem } from "./CaseListItem"
import type { Case } from "../../types"

const makeCase = (overrides: Partial<Case> = {}): Case => ({
  _id: "case-1",
  title: "Test Case",
  creatorId: "user-1",
  status: "active",
  participants: ["user-1"],
  isPinned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

const renderItem = (caseData: Case, unreadCount = 0) => {
  const onPin = vi.fn()
  const onUnpin = vi.fn()

  render(
    <MemoryRouter initialEntries={["/"]}>
      <CaseListItem
        caseData={caseData}
        unreadCount={unreadCount}
        onPin={onPin}
        onUnpin={onUnpin}
      />
    </MemoryRouter>,
  )

  return { onPin, onUnpin }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("CaseListItem", () => {
  it("renders the case title", () => {
    renderItem(makeCase({ title: "My Important Case" }))
    expect(screen.getByText("My Important Case")).toBeInTheDocument()
  })

  it("shows unread badge when count > 0", () => {
    renderItem(makeCase(), 5)
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("hides unread badge when count is 0", () => {
    renderItem(makeCase(), 0)
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("shows active status dot for active case", () => {
    renderItem(makeCase({ status: "active" }))
    const dot = screen.getByTitle("Active")
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass("bg-success")
  })

  it("shows archived status dot for archived case", () => {
    renderItem(makeCase({ status: "archived" }))
    const dot = screen.getByTitle("Archived")
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass("bg-text-tertiary")
  })

  it("calls onPin when pin button clicked on unpinned case", () => {
    const { onPin, onUnpin } = renderItem(makeCase({ isPinned: false }))
    const pinButton = screen.getByLabelText("Pin case")
    fireEvent.click(pinButton)
    expect(onPin).toHaveBeenCalledTimes(1)
    expect(onUnpin).not.toHaveBeenCalled()
  })

  it("calls onUnpin when pin button clicked on pinned case", () => {
    const { onPin, onUnpin } = renderItem(makeCase({ isPinned: true }))
    const unpinButton = screen.getByLabelText("Unpin case")
    fireEvent.click(unpinButton)
    expect(onUnpin).toHaveBeenCalledTimes(1)
    expect(onPin).not.toHaveBeenCalled()
  })

  it("applies active styles when route matches", () => {
    const caseData = makeCase({ _id: "case-1" })
    render(
      <MemoryRouter initialEntries={["/case/case-1"]}>
        <CaseListItem
          caseData={caseData}
          unreadCount={0}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
        />
      </MemoryRouter>,
    )
    const link = screen.getByRole("link", { name: /Case: Test Case/i })
    expect(link).toHaveClass("bg-primary-light")
    expect(link).toHaveClass("border-primary")
  })
})
