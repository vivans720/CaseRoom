import { useState, useEffect } from "react"
import type { FormEvent, JSX, KeyboardEvent } from "react"

import { useAuth } from "../../hooks/useAuth"
import { extractErrorMessage, resendOtp } from "../../services/authService"
import { OtpInput } from "../ui/OtpInput"
import { ForgotPasswordModal } from "./ForgotPasswordModal"

type AuthStep = "credentials" | "otp"

interface FormData {
  employeeId: string
  password: string
}

interface FormErrors {
  employeeId?: string
  password?: string
}

const INITIAL_FORM_DATA: FormData = {
  employeeId: "",
  password: "",
}

const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email
  const [user, domain] = email.split('@')
  if (user.length <= 4) {
    return `${user.slice(0, 1)}••••${user.slice(-1)}@${domain}`
  }
  return `${user.slice(0, 3)}••••${user.slice(-2)}@${domain}`
}

const formatTimer = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const validate = (data: FormData): FormErrors => {
  const errors: FormErrors = {}

  if (!data.employeeId.trim()) {
    errors.employeeId = "Employee ID is required"
  }

  if (!data.password) {
    errors.password = "Password is required"
  }

  return errors
}

const hasErrors = (errors: FormErrors): boolean =>
  Object.keys(errors).length > 0

const EyeOpenIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosedIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const UserIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-focus-within:text-[#6C4CF1] transition-colors duration-200">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const LockIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-focus-within:text-[#6C4CF1] transition-colors duration-200">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

interface LoginFormProps {
  onStepChange?: (step: AuthStep) => void
}

export const LoginForm = ({ onStepChange }: LoginFormProps): JSX.Element => {
  const auth = useAuth()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [shake, setShake] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const [step, setStep] = useState<AuthStep>("credentials")
  const [otpValue, setOtpValue] = useState("")
  const [tempToken, setTempToken] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])



  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLock(e.getModifierState("CapsLock"))
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return
    setIsSubmitting(true)
    setServerError("")
    try {
      await resendOtp(userEmail, "login")
      setResendTimer(60)
    } catch (error: unknown) {
      setServerError(extractErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleOtpSubmit = async (code: string) => {
    setIsSubmitting(true)
    setServerError("")
    try {
      await auth.verifyLoginOtp(tempToken, code)
      setIsVerified(true)
    } catch (error: unknown) {
      setServerError(extractErrorMessage(error))
      triggerShake()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (step === "credentials") {
      const validationErrors = validate(formData)
      if (hasErrors(validationErrors)) {
        setErrors(validationErrors)
        triggerShake()
        return
      }

      setIsSubmitting(true)
      setServerError("")

      try {
        const response = await auth.login(formData.employeeId, formData.password, rememberMe)
        if (response.requireOtp && response.tempToken) {
          setTempToken(response.tempToken)
          setUserEmail(response.email)
          setStep("otp")
          setResendTimer(60)
          setServerError("")
        }
      } catch (error: unknown) {
        setServerError(extractErrorMessage(error))
        triggerShake()
      } finally {
        setIsSubmitting(false)
      }
    } else {
      if (otpValue.length !== 6) {
        setServerError("Please enter a 6-digit OTP code")
        triggerShake()
        return
      }
      handleOtpSubmit(otpValue)
    }
  }

  return (
    <>
      <form 
        onSubmit={handleSubmit} 
        className={`flex flex-col gap-4.5 transition-transform ${shake ? "animate-bounce" : ""}`} 
        noValidate
      >
        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600 animate-in fade-in duration-200">
            <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

      {step === "credentials" ? (
        <div className="flex flex-col gap-4">
          
          {/* Employee ID */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-employee-id" className="text-[15px] font-semibold text-[#1F2937]">
              Employee ID
            </label>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <UserIcon />
              </span>
              <input
                id="login-employee-id"
                type="text"
                value={formData.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your employee ID"
                aria-describedby={errors.employeeId ? "login-employee-id-error" : undefined}
                aria-invalid={Boolean(errors.employeeId)}
                className="w-full h-[56px] rounded-xl border border-slate-200 bg-slate-50/60 pl-12 pr-4 text-[16px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12 focus:-translate-y-0.5"
              />
            </div>
            {errors.employeeId && (
              <p id="login-employee-id-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="login-password" className="text-[15px] font-semibold text-[#1F2937]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[13px] font-medium text-[#6C4CF1] hover:text-[#5B4CF3] transition-colors leading-none"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <LockIcon />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                aria-describedby={errors.password ? "login-password-error" : undefined}
                aria-invalid={Boolean(errors.password)}
                className="w-full h-[56px] rounded-xl border border-slate-200 bg-slate-50/60 pl-12 pr-12 text-[16px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12 focus:-translate-y-0.5"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md transition-all focus:outline-none"
              >
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
            
            {/* Caps Lock Indicator */}
            {isCapsLock && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 pl-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>Caps Lock is ON</span>
              </div>
            )}

            {errors.password && (
              <p id="login-password-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.password}
              </p>
            )}
          </div>

          {/* Custom Checkbox */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <button
              id="remember-me-checkbox"
              type="button"
              role="checkbox"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((prev) => !prev)}
              aria-label="Remember me on this device"
              className={`h-4 w-4 rounded-md border flex items-center justify-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/30 ${
                rememberMe
                  ? "bg-[#6C4CF1] border-[#6C4CF1] text-white shadow-2xs scale-[1.05]"
                  : "border-slate-300 bg-white hover:border-[#6C4CF1]"
              }`}
            >
              {rememberMe && (
                <svg className="h-3 w-3 animate-in zoom-in-50 duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <label 
              htmlFor="remember-me-checkbox"
              onClick={() => setRememberMe((prev) => !prev)} 
              className="text-xs font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors"
            >
              Remember me on this device
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Progress Step Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 pb-2">
            <span className="text-slate-600">Details</span>
            <span className="text-slate-300">────</span>
            <span className="flex items-center gap-1 font-bold text-[#5B4CF3]">
              <span className="h-2 w-2 rounded-full bg-[#5B4CF3] animate-pulse" />
              Verification
            </span>
            <span className="text-slate-300">────</span>
            <span className="text-slate-300">Complete</span>
          </div>

          {/* Obfuscated Masked Email */}
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">
              We&apos;ve sent a verification code to
            </p>
            <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <span>📧</span> {maskEmail(userEmail)}
            </p>
          </div>
          
          {/* 60x60 OTP Input Boxes with Auto-Submit */}
          <div className="flex justify-center py-2">
            <OtpInput
              length={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={isSubmitting || isVerified}
            />
          </div>

          {/* Success State Notification */}
          {isVerified && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-bold text-emerald-600 animate-in fade-in zoom-in-95 duration-300">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span>Verified Successfully. Redirecting...</span>
            </div>
          )}
          
          {/* Formatted Countdown Timer & Controls */}
          {!isVerified && (
            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isSubmitting}
                className="text-xs font-semibold text-[#6C4CF1] hover:text-[#5B4CF3] disabled:text-slate-400 transition-colors"
              >
                {resendTimer > 0 ? `Resend code in ${formatTimer(resendTimer)}` : "Resend Code"}
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials")
                    setTempToken("")
                    setOtpValue("")
                    setServerError("")
                    setResendTimer(0)
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 w-full"
                >
                  &larr; Change email
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Button */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting || isVerified}
          aria-busy={isSubmitting}
          aria-label={isSubmitting ? (step === "credentials" ? "Signing in..." : "Verifying...") : (step === "credentials" ? "Sign In" : "Verify Code")}
          className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-3.5 text-xs font-bold text-white shadow-[0_14px_35px_rgba(91,76,243,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(91,76,243,0.55)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0 active:shadow-[0_8px_20px_rgba(91,76,243,0.3)] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting && (
            <svg className="mr-2 h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isSubmitting
            ? step === "credentials" ? "Signing in..." : "Verifying..."
            : isVerified ? "Redirecting..." : step === "credentials" ? "Sign In" : "Verify Code"}
        </button>
      </div>
    </form>

      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
      />
    </>
  )
}
