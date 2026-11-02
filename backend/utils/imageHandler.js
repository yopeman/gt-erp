import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save base64 image string to disk in uploads directory
 * @param {string} base64String 
 * @param {string} subfolder Default 'selfies'
 * @returns {string} URL path to access the saved image
 */
export const saveBase64Image = (base64String, subfolder = 'selfies') => {
  if (!base64String || typeof base64String !== 'string') {
    return null;
  }

  // If already a hosted URL, return as is
  if (base64String.startsWith('http://') || base64String.startsWith('https://') || base64String.startsWith('/uploads/')) {
    return base64String;
  }

  try {
    const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let extension = 'jpg';
    let base64Data = base64String;

    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      base64Data = matches[2];
    }

    const filename = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return `/uploads/${subfolder}/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    return base64String;
  }
};

export default {
  saveBase64Image
};

