import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const maxSizeBytes = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeBytes, files: 6 },
});

export const singleImage = (fieldName) => upload.single(fieldName);
export const multipleImages = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

// Normalizes multer errors into ApiError so the central handler formats them consistently.
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
    return next(ApiError.badRequest(`File too large. Maximum size is ${process.env.MAX_UPLOAD_SIZE_MB || 10}MB`));      
    }
    return next(ApiError.badRequest(err.message));
  }
  next(err);
};
