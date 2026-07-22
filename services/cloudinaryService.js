import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import { Readable } from 'stream';

const streamUpload = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });

export const uploadImage = async (fileBuffer, subfolder = '') => {
  try {
    const folder = [process.env.CLOUDINARY_FOLDER || 'jw-marriage-advisory', subfolder].filter(Boolean).join('/');
    const result = await streamUpload(fileBuffer, folder);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    throw ApiError.badRequest(`Image upload failed: ${err.message}`);
  }
};

export const deleteImage = async (publicId) => {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
};

export default { uploadImage, deleteImage };
