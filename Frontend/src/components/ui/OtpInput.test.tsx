import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OtpInput } from "./OtpInput"

describe("OtpInput", () => {
  it("renders the correct number of input fields", () => {
    render(<OtpInput value="" onChange={vi.fn()} length={6} />)
    const inputs = screen.getAllByRole("textbox")
    expect(inputs).toHaveLength(6)
  })

  it("calls onChange when a digit is entered", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInput value="" onChange={onChange} length={6} />)

    const inputs = screen.getAllByRole("textbox")
    await user.type(inputs[0], "1")

    expect(onChange).toHaveBeenCalledWith("1")
  })

  it("auto-focuses the next input after a digit is entered", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInput value="" onChange={onChange} length={6} />)

    const inputs = screen.getAllByRole("textbox")
    await user.type(inputs[0], "1")

    expect(inputs[1]).toHaveFocus()
  })

  it("handles backspace to move focus and clear value", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // Value has '1' in first slot
    render(<OtpInput value="1" onChange={onChange} length={6} />)

    const inputs = screen.getAllByRole("textbox")
    // Focus second input and press backspace
    await user.click(inputs[1])
    await user.keyboard("{Backspace}")

    // Should clear first slot and focus it
    expect(onChange).toHaveBeenCalledWith("")
    expect(inputs[0]).toHaveFocus()
  })

  it("handles pasting multiple digits", async () => {
    const onChange = vi.fn()
    render(<OtpInput value="" onChange={onChange} length={6} />)

    const inputs = screen.getAllByRole("textbox")
    
    // Create a mock paste event
    const pasteData = {
      getData: (type: string) => type === 'text/plain' ? '123456' : ''
    }
    
    fireEvent.paste(inputs[0], { clipboardData: pasteData })

    expect(onChange).toHaveBeenCalledWith("123456")
  })

  it("ignores non-numeric input", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInput value="" onChange={onChange} length={4} />)

    const inputs = screen.getAllByRole("textbox")
    await user.type(inputs[0], "a")

    expect(onChange).not.toHaveBeenCalled()
  })

  it("respects the disabled prop", () => {
    render(<OtpInput value="12" onChange={vi.fn()} disabled={true} />)
    const inputs = screen.getAllByRole("textbox")
    inputs.forEach(input => {
      expect(input).toBeDisabled()
    })
  })
})
