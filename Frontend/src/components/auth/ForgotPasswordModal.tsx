import { useState, useEffect, useCallback } from "react"
import type { FormEvent, JSX } from "react"
import { extractErrorMessage, sendForgotPasswordOtp, resetPassword } from "../../services/authService"
import { OtpInput } from "../ui/OtpInput"

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = "email" | "reset"

const EyeOpenIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosedIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export const ForgotPasswordModal = ({ isOpen, onClose }: ForgotPasswordModalProps): JSX.Element | null => {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleClose = useCallback(() => {
    setStep("email")
    setEmail("")
    setOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setSuccessMsg("")
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, handleClose])

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await sendForgotPasswordOtp(email)
      setStep("reset")
      setSuccessMsg("We've sent a 6-digit code to your email.")
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMsg("")

    if (otp.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }
    
    if (!newPassword) {
      setError("New password is required")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(email, otp, newPassword)
      setSuccessMsg("Password reset successfully! You can now log in.")
      // Auto close after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-2">
          {step === "email" ? "Forgot Password" : "Reset Password"}
        </h2>
        
        <p className="text-sm text-text-secondary mb-6">
          {step === "email" 
            ? "Enter your email address and we'll send you a code to reset your password." 
            : successMsg || "Enter the code sent to your email and your new password."}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-text-primary">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
             <div className="flex justify-center mb-6">
              <OtpInput
                length={6}
                value={otp}
                onChange={setOtp}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-text-primary">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-text-primary">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </div>

            {successMsg && !error && (
               <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success text-center font-medium">
                  {successMsg}
               </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
