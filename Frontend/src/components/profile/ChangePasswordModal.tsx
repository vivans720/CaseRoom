import { useState, type JSX, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import {
  changePassword,
  extractErrorMessage,
} from "../../services/authService";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const ChangePasswordModal = ({
  isOpen,
  onClose,
}: ChangePasswordModalProps): JSX.Element | null => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);

  if (!isOpen) return null;

  const validatePassword = (password: string): string | null => {
    if (password.length < 8)
      return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password))
      return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password))
      return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password))
      return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      await changePassword(currentPassword, newPassword);
      setSuccess(true);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      size="sm"
    >
      {success ? (
        <div className="flex flex-col items-center p-6 text-center animate-in fade-in duration-300">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-extrabold text-slate-900">
            Password Changed
          </h3>
          <p className="text-xs font-medium text-slate-500">
            Your password has been successfully updated.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Current Password */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="currentPassword"
              className="text-xs font-bold text-slate-900"
            >
              Current Password
            </label>
            <div className="relative flex items-center">
              <input
                id="currentPassword"
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-4 pr-10 text-xs font-normal text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="newPassword"
              className="text-xs font-bold text-slate-900"
            >
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-4 pr-10 text-xs font-normal text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
              >
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-1 flex items-center gap-2 animate-in fade-in duration-200">
                <div className="flex flex-1 gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${newPassword.length > 0 ? (passwordStrength.score >= 1 ? passwordStrength.color : "bg-slate-200") : "bg-transparent"} flex-1`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-slate-200"} flex-1`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-slate-200"} flex-1`} />
                </div>
                <span className={`text-[10px] font-semibold ${passwordStrength.textColor}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmNewPassword"
              className="text-xs font-bold text-slate-900"
            >
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmNewPassword"
                type={showPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-4 pr-10 text-xs font-normal text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 transition-all"
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-2.5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(91,76,243,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,76,243,0.5)] focus:outline-none disabled:opacity-70"
            >
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
