import { render, screen } from "@testing-library/react"
import { Spinner } from "./Spinner"

describe("Spinner", () => {
  it("renders with default size", () => {
    render(<Spinner />)
    const spinner = screen.getByRole("status")
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass("w-8", "h-8")
  })

  it("renders with sm size", () => {
    render(<Spinner size="sm" />)
    const spinner = screen.getByRole("status")
    expect(spinner).toHaveClass("w-4", "h-4")
  })

  it("renders with lg size", () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole("status")
    expect(spinner).toHaveClass("w-12", "h-12")
  })

  it("applies custom className", () => {
    render(<Spinner className="test-class" />)
    const spinner = screen.getByRole("status")
    expect(spinner).toHaveClass("test-class")
  })
})
