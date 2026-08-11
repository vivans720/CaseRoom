import { useEffect, useRef, useState, type ChangeEvent, type JSX } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { ImageCropperModal } from "./ImageCropperModal";
import * as userService from "../../services/userService";
import { AlertCircle, Sparkles, Tag, Briefcase } from "lucide-react";
import {
  PROFILE_PICTURE_ALLOWED_TYPES,
  PROFILE_PICTURE_MAX_SIZE_BYTES,
  PROFILE_PICTURE_MAX_SIZE_MB,
} from "../../config/constants";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({
  isOpen,
  onClose,
}: ProfileModalProps): JSX.Element | null => {
  const { user, logout, updateProfilePicture, updatePhone } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? "");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleInput, setRoleInput] = useState(user?.roleName ?? "");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [skillsInput, setSkillsInput] = useState((user?.skills || []).join(", "));
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);

  useEffect(() => {
    if (user) {
      setPhoneInput(user.phone || "");
      setRoleInput(user.roleName || "");
      setSkillsInput((user.skills || []).join(", "));
    }
  }, [user]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  if (!user || !isOpen) return null;

  const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  const activeAvatarSrc = previewUrl ?? user.profilePictureUrl ?? null;

  const resetSelection = () => {
    setSelectedFile(null);
    setRawFile(null);
    setError(null);
    setIsEditingPhone(false);
    setPhoneError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type)) {
      setError("Profile picture must be JPG, PNG, WEBP, or GIF");
      event.target.value = "";
      return;
    }

    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      setError(
        `Profile picture must be ${PROFILE_PICTURE_MAX_SIZE_MB} MB or smaller`,
      );
      event.target.value = "";
      return;
    }

    setRawFile(file);
  };

  const handleSavePicture = async () => {
    if (!selectedFile) {
      setError("Choose image first");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);
      await updateProfilePicture(selectedFile);
      setSuccess("Profile picture updated");
      resetSelection();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to update profile picture";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePhone = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(trimmed)) {
      setPhoneError("Phone number must be valid (10 to 15 digits)");
      return;
    }

    try {
      setIsUpdatingPhone(true);
      setPhoneError(null);
      setSuccess(null);
      await updatePhone(trimmed);
      setSuccess("Phone number updated successfully");
      setIsEditingPhone(false);
    } catch (updateErr) {
      const message =
        updateErr instanceof Error
          ? updateErr.message
          : "Failed to update phone number";
      setPhoneError(message);
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      setIsUpdatingRole(true);
      setError(null);
      setSuccess(null);
      await userService.updateProfile({ roleName: roleInput.trim() });
      setSuccess("Role title updated successfully");
      setIsEditingRole(false);
    } catch (err) {
      setError("Failed to update role title");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleSaveSkills = async () => {
    try {
      setIsUpdatingSkills(true);
      setError(null);
      setSuccess(null);
      const skillsArray = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await userService.updateProfile({ skills: skillsArray });
      setSuccess("Skills updated successfully");
      setIsEditingSkills(false);
    } catch (err) {
      setError("Failed to update skills");
    } finally {
      setIsUpdatingSkills(false);
    }
  };

  const handleClose = () => {
    resetSelection();
    setIsEditingRole(false);
    setIsEditingSkills(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="My Profile" size="sm">
        <div className="flex flex-col items-center space-y-4 pt-1">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full focus:outline-none focus:ring-4 focus:ring-[#5B4CF3]/20"
              aria-label="Choose profile picture"
            >
              <Avatar name={user.name} size="lg" src={activeAvatarSrc} />
              <span className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/30" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                Change
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={PROFILE_PICTURE_ALLOWED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload profile picture"
            />

            <p className="text-[11px] text-slate-400 font-medium text-center">
              JPG, PNG, WEBP, GIF. Max {PROFILE_PICTURE_MAX_SIZE_MB} MB.
            </p>

            {selectedFile && (
              <p className="text-xs font-semibold text-[#5B4CF3]">
                Selected: {selectedFile.name}
              </p>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-600">
                {success}
              </div>
            )}

            {error && (
              <div
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{user.name}</h3>
            <p className="text-xs font-semibold text-slate-500">{user.employeeId}</p>
          </div>

          {(!user.roleName || !user.skills || user.skills.length === 0) && (
            <div className="w-full p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  Complete Your Profile
                  <Sparkles className="w-3 h-3 text-[#5B4CF3]" />
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Please update your Role Title and Skills below so admins can invite you to relevant case investigations!
                </p>
              </div>
            </div>
          )}

          <div className="w-full space-y-2.5 pt-1">
            {/* Role Title Field */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Role Title
                </p>
                {!isEditingRole && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoleInput(user.roleName || "");
                      setIsEditingRole(true);
                    }}
                    className="text-[11px] font-bold text-[#5B4CF3] hover:underline focus:outline-none"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingRole ? (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="e.g. Security Analyst, Backend Dev"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#5B4CF3] focus:outline-none focus:ring-2 focus:ring-[#5B4CF3]/20"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRole}
                      disabled={isUpdatingRole}
                      className="rounded-xl bg-[#5B4CF3] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                    >
                      {isUpdatingRole ? <Spinner size="sm" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingRole(false)}
                      disabled={isUpdatingRole}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {user.roleName || <span className="text-amber-600 font-semibold italic">Not specified (Click Edit)</span>}
                </p>
              )}
            </div>

            {/* Technical Skills Field */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Technical Skills
                </p>
                {!isEditingSkills && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkillsInput((user.skills || []).join(", "));
                      setIsEditingSkills(true);
                    }}
                    className="text-[11px] font-bold text-[#5B4CF3] hover:underline focus:outline-none"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingSkills ? (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="e.g. Database, Auth, React, Legal"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#5B4CF3] focus:outline-none focus:ring-2 focus:ring-[#5B4CF3]/20"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={isUpdatingSkills}
                      className="rounded-xl bg-[#5B4CF3] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                    >
                      {isUpdatingSkills ? <Spinner size="sm" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSkills(false)}
                      disabled={isUpdatingSkills}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Separate multiple skills with commas</p>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3] text-[10px] font-bold">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold italic">No skills added (Click Edit)</span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{user.email}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                {!isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(user.phone || "");
                      setPhoneError(null);
                      setIsEditingPhone(true);
                    }}
                    className="text-[11px] font-bold text-[#5B4CF3] hover:underline focus:outline-none"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingPhone ? (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        setPhoneError(null);
                      }}
                      placeholder="Enter phone number"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#5B4CF3] focus:outline-none focus:ring-2 focus:ring-[#5B4CF3]/20"
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      disabled={isUpdatingPhone}
                      className="rounded-xl bg-[#5B4CF3] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                    >
                      {isUpdatingPhone ? <Spinner size="sm" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPhone(false);
                        setPhoneError(null);
                        setPhoneInput(user.phone || "");
                      }}
                      disabled={isUpdatingPhone}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {phoneError && (
                    <p className="text-[11px] font-medium text-red-600">{phoneError}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-900 mt-0.5">{user.phone}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joined</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{joinedDate}</p>
            </div>
          </div>

          <div className="w-full pt-2 space-y-2">
            {selectedFile && (
              <button
                type="button"
                onClick={handleSavePicture}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-3 text-xs font-bold text-white shadow-[0_12px_30px_rgba(91,76,243,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,76,243,0.5)] focus:outline-none disabled:opacity-60"
              >
                {isUploading ? <Spinner size="sm" /> : "Save Photo"}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="w-full rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] px-4 py-3 text-xs font-bold text-white shadow-[0_12px_30px_rgba(91,76,243,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,76,243,0.5)] focus:outline-none disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                void logout();
                handleClose();
              }}
              disabled={isUploading}
              className="w-full rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs font-bold text-red-600 transition-all duration-200 hover:bg-red-600 hover:text-white focus:outline-none disabled:opacity-60"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>

      <ImageCropperModal
        isOpen={!!rawFile}
        imageFile={rawFile}
        onClose={() => {
          setRawFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        onCropComplete={(croppedFile) => {
          setSelectedFile(croppedFile);
          setRawFile(null);
        }}
      />
    </>
  );
};
