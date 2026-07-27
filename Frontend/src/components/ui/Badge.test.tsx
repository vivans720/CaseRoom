import { render, screen } from "@testing-library/react"
import { Badge } from "./Badge"

describe("Badge", () => {
  it("renders correctly with count", () => {
    render(<Badge count={5} />)
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByLabelText("5 unread")).toBeInTheDocument()
  })

  it("renders max+ if count exceeds max", () => {
    render(<Badge count={101} max={99} />)
    expect(screen.getByText("99+")).toBeInTheDocument()
    expect(screen.getByLabelText("101 unread")).toBeInTheDocument()
  })

  it("does not render if count is 0", () => {
    const { container } = render(<Badge count={0} />)
    expect(container.firstChild).toBeNull()
  })

  it("does not render if count is negative", () => {
    const { container } = render(<Badge count={-1} />)
    expect(container.firstChild).toBeNull()
  })
})
