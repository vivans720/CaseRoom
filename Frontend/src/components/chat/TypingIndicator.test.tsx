import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TypingIndicator } from "./TypingIndicator"

describe("TypingIndicator — renders nothing when empty", () => {
  it("returns null when typingUserNames is empty", () => {
    const { container } = render(<TypingIndicator typingUserNames={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe("TypingIndicator — 1 user", () => {
  it("shows 'Alice is typing' for one user", () => {
    render(<TypingIndicator typingUserNames={["Alice"]} />)
    expect(screen.getByText("Alice is typing")).toBeInTheDocument()
  })
})

describe("TypingIndicator — 2 users", () => {
  it("shows 'Alice and Bob are typing' for two users", () => {
    render(<TypingIndicator typingUserNames={["Alice", "Bob"]} />)
    expect(screen.getByText("Alice and Bob are typing")).toBeInTheDocument()
  })
})

describe("TypingIndicator — 3+ users", () => {
  it("shows 'Alice, Bob and 1 other are typing' for three users", () => {
    render(<TypingIndicator typingUserNames={["Alice", "Bob", "Carol"]} />)
    expect(screen.getByText("Alice, Bob and 1 other are typing")).toBeInTheDocument()
  })

  it("shows 'Alice, Bob and 2 others are typing' for four users", () => {
    render(<TypingIndicator typingUserNames={["Alice", "Bob", "Carol", "Dave"]} />)
    expect(screen.getByText("Alice, Bob and 2 others are typing")).toBeInTheDocument()
  })
})

describe("TypingIndicator — accessibility", () => {
  it("has aria-live='polite' on the container", () => {
    render(<TypingIndicator typingUserNames={["Alice"]} />)
    // Use aria-label to uniquely target the indicator container
    const container = screen.getByLabelText("Alice is typing…")
    expect(container).toHaveAttribute("aria-live", "polite")
  })
})
