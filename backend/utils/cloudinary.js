import crypto from 'crypto';
import { cloudinaryConfig, isCloudinaryConfigured } from '../config/cloudinary.js';
import { saveBase64Image } from './imageHandler.js';

/**
 * Generate signature for Cloudinary authenticated upload
 */
const generateSignature = (params, apiSecret) => {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
};

/**
 * Upload a file (base64 string, URL, or data URI) to Cloudinary
 * @param {string} file - base64 string, data URI, or remote URL
 * @param {Object} options - { folder, resourceType = 'auto', publicId }
 * @returns {Promise<{ url: string, publicId: string, secureUrl: string }>}
 */
export const uploadToCloudinary = async (file, options = {}) => {
  if (!file) {
    throw new Error('File data is required for upload');
  }

  const { folder = 'gt_erp', resourceType = 'auto', publicId } = options;

  // If Cloudinary is not yet configured, fall back to safe local storage
  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinary credentials missing in .env. Falling back to local storage.');
    const localUrl = saveBase64Image(file, folder.replace(/[^a-zA-Z0-9]/g, '_'));
    return {
      url: localUrl,
      secureUrl: localUrl,
      publicId: `local_${Date.now()}`
    };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;

    const bodyParams = {
      timestamp: String(timestamp),
      folder
    };

    if (publicId) {
      bodyParams.public_id = publicId;
    }

    if (cloudinaryConfig.uploadPreset) {
      bodyParams.upload_preset = cloudinaryConfig.uploadPreset;
    } else if (cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
      bodyParams.api_key = cloudinaryConfig.apiKey;
      bodyParams.signature = generateSignature(bodyParams, cloudinaryConfig.apiSecret);
    }

    // Prepare multipart form data or URL-encoded form
    const formData = new URLSearchParams();
    formData.append('file', file);
    for (const [key, value] of Object.entries(bodyParams)) {
      formData.append(key, value);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to upload to Cloudinary');
    }

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    // Graceful fallback to local image handler so system remains functional
    const localUrl = saveBase64Image(file, 'fallback');
    return {
      url: localUrl,
      secureUrl: localUrl,
      publicId: `fallback_${Date.now()}`
    };
  }
};

export default {
  uploadToCloudinary
};

