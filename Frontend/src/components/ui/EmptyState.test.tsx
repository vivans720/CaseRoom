import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EmptyState } from "./EmptyState"

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No Cases" description="Create a new case to get started." />)
    expect(screen.getByText("No Cases")).toBeInTheDocument()
    expect(screen.getByText("Create a new case to get started.")).toBeInTheDocument()
  })

  it("renders action button and triggers onClick", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState 
        title="No Cases" 
        action={{ label: "Create Case", onClick }} 
      />
    )

    const button = screen.getByRole("button", { name: /create case/i })
    expect(button).toBeInTheDocument()
    
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders without description and action", () => {
    render(<EmptyState title="Simple Title" />)
    expect(screen.getByText("Simple Title")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
