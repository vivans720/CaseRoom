import { render, screen, fireEvent } from "@testing-library/react"
import { FileUploadButton } from "./FileUploadButton"
import * as fileUploadUtils from "../../utils/fileUpload"
import { vi, Mock } from "vitest"

vi.mock("../../utils/fileUpload")

describe("FileUploadButton", () => {
  const onFileSelect = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fileUploadUtils.validateFileType as Mock).mockReturnValue(true)
    ;(fileUploadUtils.validateFileSize as Mock).mockReturnValue(true)
  })

  it("renders the attach button", () => {
    render(
      <FileUploadButton onFileSelect={onFileSelect} onError={onError} />
    )
    expect(screen.getByLabelText(/attach file/i)).toBeInTheDocument()
  })

  it("calls onFileSelect when a valid file is selected", () => {
    render(
      <FileUploadButton onFileSelect={onFileSelect} onError={onError} />
    )
    
    const input = screen.getByTestId("file-upload-input")
    const file = new File(["hello"], "hello.png", { type: "image/png" })
    
    fireEvent.change(input, { target: { files: [file] } })

    expect(onFileSelect).toHaveBeenCalledWith(file)
    expect(onError).not.toHaveBeenCalled()
  })

  it("calls onError when an invalid file type is selected", () => {
    ;(fileUploadUtils.validateFileType as Mock).mockReturnValue(false)
    
    render(
      <FileUploadButton onFileSelect={onFileSelect} onError={onError} />
    )
    
    const input = screen.getByTestId("file-upload-input")
    const file = new File(["hello"], "hello.txt", { type: "text/plain" })
    
    fireEvent.change(input, { target: { files: [file] } })

    expect(onError).toHaveBeenCalledWith("Invalid file type unallowed.")
    expect(onFileSelect).not.toHaveBeenCalled()
  })

  it("calls onError when a file exceeds size limit", () => {
    ;(fileUploadUtils.validateFileSize as Mock).mockReturnValue(false)
    
    render(
      <FileUploadButton onFileSelect={onFileSelect} onError={onError} />
    )
    
    const input = screen.getByTestId("file-upload-input")
    const file = new File(["large"], "large.png", { type: "image/png" })
    
    fireEvent.change(input, { target: { files: [file] } })

    expect(onError).toHaveBeenCalledWith("File size exceeds the 16MB limit.")
    expect(onFileSelect).not.toHaveBeenCalled()
  })

  it("disables the button when disabled prop is true", () => {
    render(
      <FileUploadButton onFileSelect={onFileSelect} onError={onError} disabled={true} />
    )
    expect(screen.getByLabelText(/attach file/i)).toBeDisabled()
  })
})
