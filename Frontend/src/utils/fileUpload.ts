import {
  FILE_UPLOAD_LIMIT_BYTES,
  ALLOWED_FILE_TYPES,
} from "../config/constants";

export const validateFileSize = (fileSize: number): boolean => {
  return fileSize <= FILE_UPLOAD_LIMIT_BYTES;
};

export const validateFileType = (mimeType: string): boolean => {
  return ALLOWED_FILE_TYPES.includes(mimeType);
};

export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
