import { useState, useRef, useEffect } from "react"
import type { JSX, FormEvent } from "react"
import { Modal } from "../ui/Modal"
import { Spinner } from "../ui/Spinner"
import * as caseService from "../../services/caseService"
import type { Case, CasePriority, CaseCategory } from "../../types"

const TITLE_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (newCase: Case) => void
}

const validateTitle = (title: string): string | null => {
  if (!title.trim()) return "Case title is required."
  if (title.trim().length > TITLE_MAX_LENGTH)
    return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`
  return null
}

export const CreateCaseModal = ({
  isOpen,
  onClose,
  onCreated,
}: CreateCaseModalProps): JSX.Element => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<CasePriority>("Medium")
  const [category, setCategory] = useState<CaseCategory>("Incident")
  const [titleError, setTitleError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setDescription("")
      setPriority("Medium")
      setCategory("Incident")
      setTitleError(null)
      setServerError(null)
      setIsSubmitting(false)
      setTimeout(() => titleInputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const error = validateTitle(title)
    if (error) {
      setTitleError(error)
      return
    }

    setTitleError(null)
    setServerError(null)
    setIsSubmitting(true)

    try {
      const newCase = await caseService.createCase(
        title.trim(),
        description.trim() || undefined,
        priority,
        category,
      )
      onCreated(newCase)
      onClose()
    } catch {
      setServerError("Failed to create case. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value)
    if (titleError) setTitleError(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Case" size="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        {/* Title field */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="create-case-title"
            className="text-[14px] font-semibold text-[#1F2937]"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              ref={titleInputRef}
              id="create-case-title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              maxLength={TITLE_MAX_LENGTH}
              disabled={isSubmitting}
              placeholder="e.g. Customer complaint — Invoice #4821"
              className={[
                "w-full h-[52px] rounded-xl border pl-4 pr-16 text-[14px] font-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12",
                "bg-slate-50/70 border-slate-200/90",
                titleError ? "border-red-500 focus:border-red-500 focus:ring-red-500/12" : "",
                isSubmitting ? "opacity-50" : "",
              ].join(" ")}
              aria-describedby={titleError ? "title-error" : undefined}
              aria-invalid={!!titleError}
            />
            {/* Counter inside input */}
            <span className="absolute right-3 text-[11px] font-medium text-slate-400 select-none">
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>
          {titleError && (
            <p id="title-error" className="text-[11px] text-red-500 font-medium pl-0.5" role="alert">
              {titleError}
            </p>
          )}
        </div>

        {/* Description field */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="create-case-description"
            className="text-[14px] font-semibold text-[#1F2937]"
          >
            Description{" "}
            <span className="text-xs font-normal text-slate-400">
              (optional)
            </span>
          </label>
          <div className="relative flex flex-col">
            <textarea
              id="create-case-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX_LENGTH}
              disabled={isSubmitting}
              rows={3}
              placeholder="Briefly describe the case..."
              className={[
                "w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 pb-6 text-[14px] font-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12",
                isSubmitting ? "opacity-50" : "",
              ].join(" ")}
            />
            {/* Counter inside textarea */}
            <span className="absolute bottom-2 right-3 text-[11px] font-medium text-slate-400 select-none">
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Priority & Category selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="create-case-priority"
              className="text-[14px] font-semibold text-[#1F2937]"
            >
              Priority
            </label>
            <select
              id="create-case-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as CasePriority)}
              disabled={isSubmitting}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-[14px] font-semibold text-[#111827] outline-none transition-all focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 disabled:opacity-50"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="create-case-category"
              className="text-[14px] font-semibold text-[#1F2937]"
            >
              Category
            </label>
            <select
              id="create-case-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory)}
              disabled={isSubmitting}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-[14px] font-semibold text-[#111827] outline-none transition-all focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 disabled:opacity-50"
            >
              <option value="Incident">Incident</option>
              <option value="HR">HR</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <p className="text-xs text-red-500 font-medium" role="alert">
            {serverError}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            id="create-case-submit"
            className="flex min-w-[110px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-5 py-2.5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(91,76,243,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,76,243,0.5)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                Creating…
              </>
            ) : (
              "Create Case"
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
