import { render, screen, fireEvent } from "@testing-library/react"
import { Modal } from "./Modal"

describe("Modal", () => {
  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    )
    expect(screen.getByText("Test Modal")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    )
    expect(screen.queryByText("Content")).not.toBeInTheDocument()
  })

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    )
    
    // The backdrop has role="dialog" or we can target the fixed-inset div
    const backdrop = screen.getByRole("dialog")
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose when modal content is clicked", () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div data-testid="content">Content</div>
      </Modal>
    )
    
    const content = screen.getByTestId("content")
    fireEvent.click(content)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("focuses the modal panel when opened", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    )
    
    // The panel has tabIndex={-1} and is focused
    const panel = screen.getByText("Content").closest("div[tabindex='-1']")
    expect(panel).toHaveFocus()
  })
})
