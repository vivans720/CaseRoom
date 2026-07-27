export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "/";

export const AUTH_TOKEN_STORAGE_KEY = "caseroom_auth_token";

export const FILE_UPLOAD_LIMIT_MB = 16;
export const FILE_UPLOAD_LIMIT_BYTES = FILE_UPLOAD_LIMIT_MB * 1024 * 1024;

export const PROFILE_PICTURE_MAX_SIZE_MB = 5;
export const PROFILE_PICTURE_MAX_SIZE_BYTES =
  PROFILE_PICTURE_MAX_SIZE_MB * 1024 * 1024;

export const PROFILE_PICTURE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
