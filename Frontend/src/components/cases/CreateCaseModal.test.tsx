import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CreateCaseModal } from "./CreateCaseModal"
import * as caseService from "../../services/caseService"
import type { Case } from "../../types"

vi.mock("../../services/caseService")

const mockedCaseService = vi.mocked(caseService)

const mockCase: Case = {
  _id: "case-new",
  title: "New Case",
  creatorId: "user-1",
  status: "active",
  participants: ["user-1"],
  isPinned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

const renderModal = (isOpen = true) => {
  const onClose = vi.fn()
  const onCreated = vi.fn()

  render(
    <CreateCaseModal isOpen={isOpen} onClose={onClose} onCreated={onCreated} />,
  )

  return { onClose, onCreated }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("CreateCaseModal — visibility", () => {
  it("renders nothing when isOpen is false", () => {
    renderModal(false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the modal when isOpen is true", () => {
    renderModal(true)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("New Case")).toBeInTheDocument()
  })
})

describe("CreateCaseModal — validation", () => {
  it("shows error when submitting with empty title", async () => {
    renderModal()

    fireEvent.click(screen.getByRole("button", { name: /create case/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Case title is required.",
      )
    })
    expect(mockedCaseService.createCase).not.toHaveBeenCalled()
  })

  it("clears title error when user starts typing", async () => {
    renderModal()

    fireEvent.click(screen.getByRole("button", { name: /create case/i }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText(/title/i), "A")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("CreateCaseModal — submission", () => {
  it("calls createCase with correct args and closes on success", async () => {
    mockedCaseService.createCase.mockResolvedValue(mockCase)
    const { onClose, onCreated } = renderModal()

    await userEvent.type(screen.getByLabelText(/title/i), "New Case")
    await userEvent.type(
      screen.getByLabelText(/description/i),
      "A description",
    )
    fireEvent.click(screen.getByRole("button", { name: /create case/i }))

    await waitFor(() => {
      expect(mockedCaseService.createCase).toHaveBeenCalledWith(
        "New Case",
        "A description",
        "Medium",
        "Incident",
      )
      expect(onCreated).toHaveBeenCalledWith(mockCase)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("shows server error and does not close on failure", async () => {
    mockedCaseService.createCase.mockRejectedValue(new Error("Server error"))
    const { onClose } = renderModal()

    await userEvent.type(screen.getByLabelText(/title/i), "New Case")
    fireEvent.click(screen.getByRole("button", { name: /create case/i }))

    await waitFor(() => {
      expect(
        screen.getByText("Failed to create case. Please try again."),
      ).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("disables submit button while submitting", async () => {
    mockedCaseService.createCase.mockImplementation(
      () => new Promise(() => {}), // never resolves
    )
    renderModal()

    await userEvent.type(screen.getByLabelText(/title/i), "New Case")
    fireEvent.click(screen.getByRole("button", { name: /create case/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled()
    })
  })
})

describe("CreateCaseModal — keyboard", () => {
  it("calls onClose when Escape key pressed", async () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
