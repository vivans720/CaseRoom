const MAX_FILE_SIZE =
  (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 16) * 1024 * 1024; // bytes

const PROFILE_PICTURE_MAX_FILE_SIZE =
  (parseInt(process.env.PROFILE_PICTURE_MAX_FILE_SIZE_MB, 10) || 5) *
  1024 *
  1024;

const ALLOWED_MIME_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
  ],
};

const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_FOLDER || "caseroom/attachments";

const PROFILE_PICTURE_FOLDER =
  process.env.CLOUDINARY_PROFILE_FOLDER || "caseroom/profile-pictures";

const ALL_ALLOWED_MIMES = new Set(Object.values(ALLOWED_MIME_TYPES).flat());
const IMAGE_ALLOWED_MIMES = new Set(ALLOWED_MIME_TYPES.image);

const getMimeCategory = (mimeType) => {
  for (const [category, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) return category;
  }
  return null;
};
module.exports = {
  MAX_FILE_SIZE,
  PROFILE_PICTURE_MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  CLOUDINARY_FOLDER,
  PROFILE_PICTURE_FOLDER,
  ALL_ALLOWED_MIMES,
  IMAGE_ALLOWED_MIMES,
  getMimeCategory,
};
