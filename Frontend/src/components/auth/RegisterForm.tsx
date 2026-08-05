import { useState, useEffect } from "react"
import type { FormEvent, JSX } from "react"

import { useAuth } from "../../hooks/useAuth"
import { extractErrorMessage, sendRegisterOtp, resendOtp } from "../../services/authService"
import { OtpInput } from "../ui/OtpInput"

type AuthStep = "details" | "otp"

interface FormData {
  employeeId: string
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  employeeId?: string
  name?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

const INITIAL_FORM_DATA: FormData = {
  employeeId: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
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

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
const PHONE_REGEX = /^\+?[0-9]{10,15}$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const validate = (data: FormData): FormErrors => {
  const errors: FormErrors = {}

  if (!data.employeeId.trim()) {
    errors.employeeId = "Required"
  }

  if (!data.name.trim()) {
    errors.name = "Required"
  } else if (data.name.trim().length < 2) {
    errors.name = "Min 2 chars"
  }

  if (!data.email.trim()) {
    errors.email = "Required"
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "Invalid email format"
  }

  if (!data.phone.trim()) {
    errors.phone = "Required"
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.phone = "10 to 15 digits"
  }

  if (!data.password) {
    errors.password = "Required"
  } else if (!PASSWORD_REGEX.test(data.password)) {
    errors.password = "Min 8 chars, A-z, 0-9"
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Required"
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords mismatch"
  }

  return errors
}

const hasErrors = (errors: FormErrors): boolean =>
  Object.keys(errors).length > 0

const getPasswordStrength = (pass: string): { label: string; score: number; color: string; textColor: string } => {
  if (!pass) return { label: "", score: 0, color: "", textColor: "" }
  let score = 0
  if (pass.length >= 8) score += 1
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1

  if (score === 1) return { label: "Weak Password", score: 1, color: "bg-red-500", textColor: "text-red-500" }
  if (score === 2) return { label: "Medium Password", score: 2, color: "bg-amber-500", textColor: "text-amber-500" }
  return { label: "Strong Password ✔", score: 3, color: "bg-emerald-500", textColor: "text-emerald-500" }
}

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

const EmailIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-focus-within:text-[#6C4CF1] transition-colors duration-200">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
)

const PhoneIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-focus-within:text-[#6C4CF1] transition-colors duration-200">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const LockIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-focus-within:text-[#6C4CF1] transition-colors duration-200">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

interface RegisterFormProps {
  onStepChange?: (step: AuthStep) => void
}

export const RegisterForm = ({ onStepChange }: RegisterFormProps): JSX.Element => {
  const auth = useAuth()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  
  const [step, setStep] = useState<AuthStep>("details")
  const [otpValue, setOtpValue] = useState("")
  const [resendTimer, setResendTimer] = useState(0)

  const passwordStrength = getPasswordStrength(formData.password)

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (step === "otp" && otpValue.length === 6 && !isSubmitting && !isVerified) {
      handleOtpSubmit(otpValue)
    }
  }, [otpValue, step])

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return
    setIsSubmitting(true)
    setServerError("")
    try {
      await resendOtp(formData.email, "registration")
      setResendTimer(60)
    } catch (error: unknown) {
      setServerError(extractErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

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
      await auth.register({
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      }, code)
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

    if (step === "details") {
      const validationErrors = validate(formData)
      if (hasErrors(validationErrors)) {
        setErrors(validationErrors)
        triggerShake()
        return
      }

      setIsSubmitting(true)
      setServerError("")

      try {
        await sendRegisterOtp({
          employeeId: formData.employeeId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        })
        
        setStep("otp")
        setResendTimer(60)
        setServerError("")
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
    <form 
      onSubmit={handleSubmit} 
      className={`flex flex-col gap-3 ${shake ? "animate-bounce" : ""}`} 
      noValidate
    >
      {serverError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-600 animate-in fade-in duration-200">
          <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {step === "details" ? (
        <div className="flex flex-col gap-2.5">
          
          {/* Employee ID */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="register-employee-id" className="text-[14px] font-semibold text-[#1F2937]">
              Employee ID
            </label>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <UserIcon />
              </span>
              <input
                id="register-employee-id"
                type="text"
                value={formData.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
                placeholder="EMP-1002"
                aria-describedby={errors.employeeId ? "register-employee-id-error" : undefined}
                aria-invalid={Boolean(errors.employeeId)}
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-12 pr-3 text-[14px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
              />
            </div>
            {errors.employeeId && (
              <p id="register-employee-id-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="register-name" className="text-[14px] font-semibold text-[#1F2937]">
              Full Name
            </label>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <UserIcon />
              </span>
              <input
                id="register-name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="John Doe"
                aria-describedby={errors.name ? "register-name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-12 pr-3 text-[14px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
              />
            </div>
            {errors.name && (
              <p id="register-name-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="register-email" className="text-[14px] font-semibold text-[#1F2937]">
                Email
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-3.5">
                  <EmailIcon />
                </span>
                <input
                  id="register-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john.doe@company.com"
                  aria-describedby={errors.email ? "register-email-error" : undefined}
                  aria-invalid={Boolean(errors.email)}
                  className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 pr-2.5 text-[13px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
                />
              </div>
              {errors.email && (
                <p id="register-email-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <label htmlFor="register-phone" className="text-[14px] font-semibold text-[#1F2937]">
                Phone
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-3.5">
                  <PhoneIcon />
                </span>
                <input
                  id="register-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 234 567 8901"
                  aria-describedby={errors.phone ? "register-phone-error" : undefined}
                  aria-invalid={Boolean(errors.phone)}
                  className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 pr-2.5 text-[13px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
                />
              </div>
              {errors.phone && (
                <p id="register-phone-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Password with Strength Meter */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="register-password" className="text-[14px] font-semibold text-[#1F2937]">
              Password
            </label>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <LockIcon />
              </span>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Enter a strong password"
                aria-describedby={errors.password ? "register-password-error" : undefined}
                aria-invalid={Boolean(errors.password)}
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-12 pr-9 text-[13px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-all focus:outline-none"
              >
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-1 flex items-center gap-2 animate-in fade-in duration-200">
                <div className="flex flex-1 gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${formData.password.length > 0 ? (passwordStrength.score >= 1 ? passwordStrength.color : "bg-slate-200") : "bg-transparent"} flex-1`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-slate-200"} flex-1`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-slate-200"} flex-1`} />
                </div>
                <span className={`text-[11px] font-medium ${passwordStrength.textColor}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}

            {errors.password && !formData.password && (
              <p id="register-password-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="register-confirm-password" className="text-[14px] font-semibold text-[#1F2937]">
              Confirm Password
            </label>
            <div className="relative flex items-center group">
              <span className="absolute left-4">
                <LockIcon />
              </span>
              <input
                id="register-confirm-password"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
                aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
                aria-invalid={Boolean(errors.confirmPassword)}
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-12 pr-9 text-[13px] font-normal tracking-normal text-[#111827] placeholder:text-[#94A3B8] placeholder:font-normal transition-all duration-[180ms] ease-in-out focus:border-[#6C4CF1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/12"
              />
            </div>
            {errors.confirmPassword && (
              <p id="register-confirm-password-error" className="text-[11px] text-red-500 font-medium pl-0.5">
                {errors.confirmPassword}
              </p>
            )}
          </div>

        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Progress Step Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 pb-1">
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
              <span>📧</span> {maskEmail(formData.email)}
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

          {/* Formatted Countdown Timer & Change Email Control */}
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
                    setStep("details")
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
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isVerified}
          aria-busy={isSubmitting}
          className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-3 text-xs font-bold text-white shadow-[0_14px_35px_rgba(91,76,243,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(91,76,243,0.55)] focus:outline-none focus:ring-4 focus:ring-[#6C4CF1]/25 active:translate-y-0 active:shadow-[0_8px_20px_rgba(91,76,243,0.3)] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting && (
            <svg className="mr-2 h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isSubmitting
            ? step === "details" ? "Sending Code..." : "Verifying..."
            : isVerified ? "Redirecting..." : step === "details" ? "Continue to Verification" : "Create Account"}
        </button>
      </div>
    </form>
  )
}
