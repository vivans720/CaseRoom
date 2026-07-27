import React, { useRef } from "react";
import { Paperclip } from "lucide-react";
import { ALLOWED_FILE_TYPES } from "../../config/constants";
import { validateFileSize, validateFileType } from "../../utils/fileUpload";

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFileSelect,
  onError,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediately clear input so the same file could be selected again
    e.target.value = "";

    if (!validateFileType(file.type)) {
      onError("Invalid file type unallowed.");
      return;
    }

    if (!validateFileSize(file.size)) {
      onError("File size exceeds the 16MB limit.");
      return;
    }

    onFileSelect(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={ALLOWED_FILE_TYPES.join(",")}
        onChange={handleFileChange}
        disabled={disabled}
        data-testid="file-upload-input"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="p-2 text-text-secondary hover:text-primary hover:bg-surface-hover rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Attach File"
      >
        <Paperclip size={20} />
      </button>
    </>
  );
};
