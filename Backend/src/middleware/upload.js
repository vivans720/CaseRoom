const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const {
  MAX_FILE_SIZE,
  CLOUDINARY_FOLDER,
  ALL_ALLOWED_MIMES,
  PROFILE_PICTURE_MAX_FILE_SIZE,
  PROFILE_PICTURE_FOLDER,
  IMAGE_ALLOWED_MIMES,
} = require("../config/upload");

const createUploadHandler = ({ folder, allowedMimes, maxFileSize }) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: (req, file) => {
        if (file.mimetype.startsWith("image/")) return "image";
        if (file.mimetype.startsWith("video/")) return "video";
        if (file.mimetype.startsWith("audio/")) return "video";
        return "raw";
      },
      access_mode: "public",
      allowed_formats: null,
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSize },
  }).single("file");
};

const uploadSingle = createUploadHandler({
  folder: CLOUDINARY_FOLDER,
  allowedMimes: ALL_ALLOWED_MIMES,
  maxFileSize: MAX_FILE_SIZE,
});

const uploadImageSingle = createUploadHandler({
  folder: PROFILE_PICTURE_FOLDER,
  allowedMimes: IMAGE_ALLOWED_MIMES,
  maxFileSize: PROFILE_PICTURE_MAX_FILE_SIZE,
});

// Wrapper function to catch Multer errors and pass them to our global error handler
const handleUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      const error = new Error(err.message || "File upload error");

      // Handle file size limit error specifically
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        error.statusCode = 413; // Payload Too Large
        error.message = `File too large. Maximum size allowed is ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB.`;
      } else {
        error.statusCode = 400; // Bad Request
      }
      return next(error);
    }
    next();
  });
};

const handleImageUpload = (req, res, next) => {
  uploadImageSingle(req, res, (err) => {
    if (err) {
      const error = new Error(err.message || "File upload error");

      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        error.statusCode = 413;
        error.message = `File too large. Maximum size allowed is ${
          PROFILE_PICTURE_MAX_FILE_SIZE / (1024 * 1024)
        }MB.`;
      } else {
        error.statusCode = 400;
      }
      return next(error);
    }
    next();
  });
};

module.exports = {
  handleUpload,
  handleImageUpload,
};
