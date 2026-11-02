import dotenv from 'dotenv';
dotenv.config();

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
};

export const isCloudinaryConfigured = () => {
  return Boolean(cloudinaryConfig.cloudName && (cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret || cloudinaryConfig.uploadPreset));
};

export default cloudinaryConfig;

